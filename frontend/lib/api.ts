import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mypoll-w391.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface PollOption {
  id: number;
  text: string;
  isCorrect: boolean;
  votes?: number;
}

interface PollData {
  question: string;
  options: PollOption[];
  timeLimit: number;
}

interface ResponseData {
  selectedOption: number;
  studentId?: string;
  studentName?: string;
}

export const pollAPI = {
  getAllPolls: async () => {
    try {
      const response = await api.get('/polls');
      return response.data;
    } catch (error) {
      console.error('Error fetching all polls:', error);
      const axiosError = error as AxiosError;
      throw axiosError.response?.data || error;
    }
  },

  createPoll: async (pollData: PollData) => {
    try {
      const response = await api.post('/polls', pollData);
      return response.data;
    } catch (error) {
      console.error('Error creating poll:', error);
      const axiosError = error as AxiosError;
      throw axiosError.response?.data || error;
    }
  },

  getActivePoll: async () => {
    try {
      const response = await api.get('/polls/active');
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        return null; 
      }
      console.error('Error fetching active poll:', error);
      throw axiosError.response?.data || error;
    }
  },

  submitResponse: async (pollId: string, responseData: ResponseData) => {
    try {
      console.log('Submitting response:', { pollId, responseData });
      const response = await api.post(`/polls/${pollId}/responses`, responseData);
      console.log('Response submitted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error submitting response:', error);
      const axiosError = error as AxiosError;
      console.error('Axios error details:', {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message
      });
      throw axiosError.response?.data || error;
    }
  },

  getPollResults: async (pollId: string) => {
    try {
      const response = await api.get(`/polls/${pollId}/results`);
      return response.data;
    } catch (error) {
      console.error('Error fetching poll results:', error);
      const axiosError = error as AxiosError;
      throw axiosError.response?.data || error;
    }
  },

  getDetailedResponses: async (pollId: string) => {
    try {
      const response = await api.get(`/polls/${pollId}/detailed-responses`);
      return response.data;
    } catch (error) {
      console.error('Error fetching detailed responses:', error);
      const axiosError = error as AxiosError;
      throw axiosError.response?.data || error;
    }
  },

  endPoll: async (pollId: string) => {
    try {
      const response = await api.post(`/polls/${pollId}/end`);
      return response.data;
    } catch (error) {
      console.error('Error ending poll:', error);
      const axiosError = error as AxiosError;
      throw axiosError.response?.data || error;
    }
  }
};

export default api;
