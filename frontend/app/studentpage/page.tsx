"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Users, Clock, CheckCircle } from "lucide-react"
import { pollAPI } from "@/lib/api"
import SocketService from "@/lib/socket"

interface PollOption {
  id: number;
  text: string;
  isCorrect?: boolean;
}

interface ActivePoll {
  _id?: string;
  id?: string;
  question: string;
  options: PollOption[];
  timeLimit: number;
  timeRemaining: number;
  totalVotes: number;
}

export default function StudentPage() {
  const router = useRouter()
  const [selectedAnswer, setSelectedAnswer] = useState("")
  const [activePoll, setActivePoll] = useState<ActivePoll | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [socketService] = useState(() => SocketService.getInstance())
  const [studentId, setStudentId] = useState("")
  const [studentName, setStudentName] = useState("")
  const [pollHistory, setPollHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    if (typeof window === 'undefined') return
    
    const storedName = localStorage.getItem('studentName')
    const storedId = localStorage.getItem('studentId')
    
    console.log('Checking stored credentials:', { storedName, storedId })
    
    if (!storedName || !storedId) {
      console.log('No credentials found, redirecting to login')
      router.replace('/loginpage?role=student')
      return
    }
    
    console.log('Credentials found, setting up student page')
    setStudentName(storedName)
    setStudentId(storedId)
    
    socketService.connect()

    socketService.onNewPoll((pollData: any) => {
      console.log('Received new poll from socket:', pollData);
      setActivePoll(pollData)
      setTimeRemaining(pollData.timeRemaining)
      setSelectedAnswer("")
      setShowHistory(false)
      fetchPollHistory()
    })

    socketService.onPollEnded(() => {
      setActivePoll(null)
      setTimeRemaining(0)
      fetchPollHistory() 
    })

    checkActivePoll()
    fetchPollHistory()

    return () => {
      socketService.offNewPoll()
      socketService.offPollEnded()
      socketService.disconnect()
    }
  }, [socketService])

  useEffect(() => {
    if (activePoll && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setShowHistory(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [activePoll, timeRemaining])

  const fetchPollHistory = async () => {
    try {
      const history = await pollAPI.getAllPolls()
      console.log('Raw poll history from API:', history)
      
      const sortedHistory = history.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        console.log(`Comparing ${a.question} (${dateA}) vs ${b.question} (${dateB})`)
        return dateB - dateA
      })
      
      console.log('Sorted poll history:', sortedHistory)
      setPollHistory(sortedHistory)
    } catch (error) {
      console.error('Error fetching poll history:', error)
    }
  }

  const checkActivePoll = async () => {
    try {
      const poll = await pollAPI.getActivePoll()
      console.log('Received active poll from API:', poll);
      if (poll) {
        setActivePoll(poll)
        setTimeRemaining(poll.timeRemaining || 0)
        setShowHistory(false)
        if (poll.timeRemaining <= 0) {
          setShowHistory(true)
        }
      } else {
        setShowHistory(true)
      }
    } catch (error) {
      console.error('Error checking active poll:', error)
      setShowHistory(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !activePoll || isSubmitting) return

    console.log('Active poll object:', activePoll);
    console.log('Poll ID:', activePoll._id);
    console.log('Poll ID (id field):', activePoll.id);

    setIsSubmitting(true)
    try {
      const pollId = activePoll._id || activePoll.id;
      if (!pollId) {
        console.error('No poll ID found in active poll:', activePoll);
        alert('Error: No poll ID found');
        return;
      }

      await pollAPI.submitResponse(pollId, {
        selectedOption: parseInt(selectedAnswer),
        studentId: studentId,
        studentName: studentName
      })
      
      fetchPollHistory()
      setShowHistory(true)
    } catch (error: any) {
      console.error('Error submitting answer:', error)
      alert(error.error || "Failed to submit answer")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="animate-spin w-8 h-8 border-4 border-[#7765DA] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-[#454545]">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="animate-spin w-8 h-8 border-4 border-[#7765DA] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-[#454545]">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!activePoll || showHistory) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <Badge className="bg-[#7765DA] text-white">Student View</Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('studentName')
                    localStorage.removeItem('studentId')
                  }
                  router.push('/loginpage?role=student')
                }}
                className="text-xs"
              >
                Change Name
              </Button>
            </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#000000] mb-2">
              {!activePoll ? "Waiting for Question" : "Poll History"}
            </h1>
            <p className="text-[#454545] mb-2">
              Welcome, {studentName}!
            </p>
            <p className="text-[#454545]">
              {!activePoll 
                ? "Please wait for your teacher to start a new poll. Here are the previous questions:" 
                : "Thank you for participating! Here are all the questions from this session:"}
            </p>
          </div>

          {pollHistory.length === 0 ? (
            <Card className="w-full max-w-2xl mx-auto text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-[#f1f1f1] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-[#454545]" />
                </div>
                <p className="text-[#454545]">No questions have been posted yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pollHistory.map((poll, index) => (
                <Card key={poll._id} className="w-full max-w-2xl mx-auto">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-[#000000] mb-2">
                          Question {index + 1}: {poll.question}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-[#454545]">
                          <span>Time Limit: {poll.timeLimit}s</span>
                          <span>Total Votes: {poll.totalVotes || 0}</span>
                          <span>
                            Posted: {new Date(poll.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <Badge variant={poll.isActive ? "default" : "secondary"}>
                        {poll.isActive ? "Active" : "Closed"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {poll.options?.map((option: any) => (
                        <div 
                          key={option.id} 
                          className={`p-3 rounded-lg border ${
                            option.isCorrect 
                              ? "bg-green-50 border-green-200" 
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">
                              {String.fromCharCode(64 + option.id)}. {option.text}
                            </span>
                            <div className="flex items-center gap-2">
                              {option.isCorrect && (
                                <Badge className="bg-green-500 text-white text-xs">
                                  Correct
                                </Badge>
                              )}
                              <span className="text-sm text-[#454545]">
                                {option.votes || 0} votes
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (activePoll && !showHistory) {
    return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#000000]">Question</h1>
              <p className="text-sm text-[#454545]">Welcome, {studentName}</p>
            </div>
            <Badge className="bg-[#7765DA] text-white">Live</Badge>
          </div>
          <div className="flex items-center gap-2 text-[#454545]">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('studentName')
                  localStorage.removeItem('studentId')
                }
                router.push('/loginpage?role=student')
              }}
              className="mr-4 text-xs"
            >
              Change Name
            </Button>
            <Users className="w-4 h-4" />
            <span>{activePoll.totalVotes || 0} participants</span>
          </div>
        </div>

        <div className="flex justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="text-[#000000]">Current Question</CardTitle>
              <div className="flex items-center gap-2 text-sm text-[#454545]">
                <Clock className="w-4 h-4" />
                <span>{formatTime(timeRemaining)} remaining</span>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-semibold text-[#000000] mb-4">
                {activePoll.question}
              </h3>

              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                <div className="space-y-3">
                  {activePoll.options.map((option) => (
                    <div 
                      key={option.id} 
                      className="flex items-center space-x-2 p-3 border border-[#d9d9d9] rounded-lg hover:bg-[#f1f1f1]"
                    >
                      <RadioGroupItem 
                        value={option.id.toString()} 
                        id={`option-${option.id}`} 
                      />
                      <Label 
                        htmlFor={`option-${option.id}`} 
                        className="flex-1 cursor-pointer text-[#000000]"
                      >
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              <Button
                className="w-full mt-4 bg-[#7765DA] hover:bg-[#480fb3] text-white"
                disabled={!selectedAnswer || isSubmitting || timeRemaining <= 0}
                onClick={handleSubmitAnswer}
              >
                {isSubmitting ? "Submitting..." : timeRemaining <= 0 ? "Time's Up!" : "Submit Answer"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-[#7765DA]"></div>
              <div className="w-2 h-2 rounded-full bg-[#d9d9d9]"></div>
              <div className="w-2 h-2 rounded-full bg-[#d9d9d9]"></div>
            </div>
            <Button variant="outline" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-6">
          <div className="animate-spin w-8 h-8 border-4 border-[#7765DA] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[#454545]">Loading...</p>
        </CardContent>
      </Card>
    </div>
  )
}
