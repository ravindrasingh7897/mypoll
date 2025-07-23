import express from 'express';
import mongoose from 'mongoose';
import Poll from '../models/Poll.js';
import Response from '../models/Response.js';

const router = express.Router();

const closeExpiredPolls = async (io) => {
  try {
    const now = new Date();
    const expiredPolls = await Poll.find({
      isActive: true,
      $expr: {
        $gte: [
          { $divide: [{ $subtract: [now, '$startTime'] }, 1000] },
          '$timeLimit'
        ]
      }
    });

    if (expiredPolls.length > 0) {
      await Poll.updateMany(
        { _id: { $in: expiredPolls.map(poll => poll._id) } },
        { 
          isActive: false,
          endTime: now
        }
      );
      
      expiredPolls.forEach(poll => {
        if (io) {
          io.emit('poll-ended', { pollId: poll._id });
        }
      });
      
      console.log(`Auto-closed ${expiredPolls.length} expired polls`);
    }
  } catch (error) {
    console.error('Error closing expired polls:', error);
  }
};

let pollCleanupInterval = null;

const initializePollCleanup = (io) => {
  if (pollCleanupInterval) {
    clearInterval(pollCleanupInterval);
  }
  pollCleanupInterval = setInterval(() => closeExpiredPolls(io), 5000);
};

router.post('/', async (req, res) => {
  try {
    const { question, options, timeLimit } = req.body;
    
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ 
        error: 'Question and at least 2 options are required' 
      });
    }

    const hasCorrectAnswer = options.some(option => option.isCorrect === true);
    if (!hasCorrectAnswer) {
      return res.status(400).json({ 
        error: 'At least one option must be marked as correct' 
      });
    }

    await Poll.updateMany({ isActive: true }, { isActive: false });

    const poll = new Poll({
      question,
      options: options.map((option, index) => ({
        id: index + 1,
        text: option.text,
        isCorrect: option.isCorrect || false,
        votes: 0
      })),
      timeLimit: parseInt(timeLimit) || 60,
      isActive: true,
      startTime: new Date()
    });

    const savedPoll = await poll.save();

    console.log('Poll created successfully:', {
      id: savedPoll._id,
      question: savedPoll.question,
      optionsCount: savedPoll.options.length
    });

    const newPollData = {
      _id: savedPoll._id,
      pollId: savedPoll._id,
      question: savedPoll.question,
      options: savedPoll.options,
      timeLimit: savedPoll.timeLimit,
      timeRemaining: savedPoll.timeRemaining,
      totalVotes: savedPoll.totalVotes || 0
    };
    
    console.log('Emitting new poll data:', newPollData);
    req.io.emit('new-poll', newPollData);

    res.status(201).json(savedPoll);
  } catch (error) {
    console.error('Error creating poll:', error);
    
    if (error.name === 'MongoTimeoutError' || error.message.includes('buffering timed out')) {
      return res.status(503).json({ 
        error: 'Database connection timeout. Please try again or check if MongoDB is running.' 
      });
    }
    
    if (error.name === 'MongoNetworkError') {
      return res.status(503).json({ 
        error: 'Database network error. Please check your internet connection.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create poll. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const polls = await Poll.find()
      .sort({ createdAt: -1 })
      .limit(50); 
    
    const pollsWithCounts = await Promise.all(
      polls.map(async (poll) => {
        const responseCount = await Response.countDocuments({ pollId: poll._id });
        return {
          ...poll.toObject(),
          responseCount
        };
      })
    );

    res.json(pollsWithCounts);
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
});

router.get('/active', async (req, res) => {
  try {
    const activePoll = await Poll.findOne({ isActive: true });
    
    if (!activePoll) {
      return res.status(404).json({ error: 'No active poll found' });
    }

    res.json(activePoll);
  } catch (error) {
    console.error('Error fetching active poll:', error);
    res.status(500).json({ error: 'Failed to fetch active poll' });
  }
});

router.post('/:pollId/responses', async (req, res) => {
  try {
    const { pollId } = req.params;
    const { selectedOption, studentId, studentName } = req.body;

    console.log('Received response submission:', { pollId, selectedOption, studentId, studentName });

    if (!mongoose.Types.ObjectId.isValid(pollId)) {
      console.log('Invalid ObjectId format:', pollId);
      return res.status(400).json({ error: 'Invalid poll ID format' });
    }

    const poll = await Poll.findById(pollId);
    if (!poll) {
      console.log('Poll not found with ID:', pollId);
      return res.status(404).json({ error: 'Poll not found' });
    }

    console.log('Found poll:', poll.question);

    if (!poll.isActive || poll.timeRemaining <= 0) {
      return res.status(400).json({ error: 'Poll is no longer active' });
    }

    const selectedOptionData = poll.options.find(opt => opt.id === selectedOption);
    if (!selectedOptionData) {
      return res.status(400).json({ error: 'Invalid option selected' });
    }

    const finalStudentId = studentId || 'student_' + Math.random().toString(36).substr(2, 9);
    const finalStudentName = studentName || 'Anonymous Student';

    const response = await Response.findOneAndUpdate(
      { pollId, studentId: finalStudentId },
      {
        pollId,
        studentId: finalStudentId,
        studentName: finalStudentName,
        selectedOption,
        isCorrect: selectedOptionData.isCorrect,
        submittedAt: new Date()
      },
      { upsert: true, new: true }
    );

    await Poll.updateOne(
      { _id: pollId },
      { $set: { 'options.$[].votes': 0, totalVotes: 0 } }
    );

    const allResponses = await Response.find({ pollId });
    const voteCounts = {};
    
    allResponses.forEach(resp => {
      voteCounts[resp.selectedOption] = (voteCounts[resp.selectedOption] || 0) + 1;
    });

    const updateOperations = [];
    for (const [optionId, count] of Object.entries(voteCounts)) {
      updateOperations.push({
        updateOne: {
          filter: { _id: pollId, 'options.id': parseInt(optionId) },
          update: { $set: { 'options.$.votes': count } }
        }
      });
    }

    if (updateOperations.length > 0) {
      await Poll.bulkWrite(updateOperations);
    }

    await Poll.updateOne(
      { _id: pollId },
      { $set: { totalVotes: allResponses.length } }
    );

    const updatedPoll = await Poll.findById(pollId);
    
    const pollData = {
      pollId: updatedPoll._id,
      totalVotes: updatedPoll.totalVotes,
      options: updatedPoll.options.map(option => ({
        id: option.id,
        text: option.text,
        votes: option.votes,
        percentage: updatedPoll.totalVotes > 0 ? 
          Math.round((option.votes / updatedPoll.totalVotes) * 100) : 0
      }))
    };

    req.io.emit('poll-results-updated', pollData);

    res.status(201).json({ 
      message: 'Response submitted successfully',
      response: response,
      pollData: pollData
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Response already submitted for this poll' });
    }
    console.error('Error submitting response:', error);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

router.get('/:pollId/results', async (req, res) => {
  try {
    const { pollId } = req.params;
    
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const responses = await Response.find({ pollId });
    
    const results = {
      pollId: poll._id,
      question: poll.question,
      totalVotes: poll.totalVotes,
      timeRemaining: poll.timeRemaining,
      isActive: poll.isActive,
      options: poll.options.map(option => ({
        id: option.id,
        text: option.text,
        votes: option.votes,
        percentage: poll.totalVotes > 0 ? 
          Math.round((option.votes / poll.totalVotes) * 100) : 0,
        isCorrect: option.isCorrect
      }))
    };

    res.json(results);
  } catch (error) {
    console.error('Error fetching poll results:', error);
    res.status(500).json({ error: 'Failed to fetch poll results' });
  }
});

router.get('/:pollId/detailed-responses', async (req, res) => {
  try {
    const { pollId } = req.params;
    
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const responses = await Response.find({ pollId }).sort({ submittedAt: -1 });
    
    const detailedResponses = responses.map(response => {
      const selectedOption = poll.options.find(opt => opt.id === response.selectedOption);
      return {
        studentId: response.studentId,
        studentName: response.studentName || 'Anonymous Student',
        selectedOption: response.selectedOption,
        selectedText: selectedOption?.text || 'Unknown option',
        isCorrect: response.isCorrect,
        submittedAt: response.submittedAt
      };
    });

    res.json({
      poll: {
        _id: poll._id,
        question: poll.question,
        options: poll.options,
        totalVotes: poll.totalVotes,
        isActive: poll.isActive
      },
      responses: detailedResponses,
      summary: {
        totalResponses: responses.length,
        correctAnswers: responses.filter(r => r.isCorrect).length,
        incorrectAnswers: responses.filter(r => !r.isCorrect).length
      }
    });
  } catch (error) {
    console.error('Error fetching detailed responses:', error);
    res.status(500).json({ error: 'Failed to fetch detailed responses' });
  }
});

router.post('/:pollId/end', async (req, res) => {
  try {
    const { pollId } = req.params;
    
    const poll = await Poll.findByIdAndUpdate(
      pollId,
      { 
        isActive: false,
        endTime: new Date()
      },
      { new: true }
    );

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    req.io.emit('poll-ended', { pollId: poll._id });

    res.json({ message: 'Poll ended successfully', poll });
  } catch (error) {
    console.error('Error ending poll:', error);
    res.status(500).json({ error: 'Failed to end poll' });
  }
});

export default router;
export { initializePollCleanup };
