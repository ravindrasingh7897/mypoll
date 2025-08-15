"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, BarChart3, Users, Plus, Eye, Clock, CheckCircle, XCircle } from "lucide-react"
import { pollAPI } from "@/lib/api"
import SocketService from "@/lib/socket"

interface PollOption {
    id: number;
    text: string;
    isCorrect: boolean;
    votes?: number;
    percentage?: number;
}

interface PollResults {
    pollId: string;
    totalVotes: number;
    options: PollOption[];
}

interface PollHistory {
    _id: string;
    question: string;
    options: PollOption[];
    totalVotes: number;
    responseCount: number;
    isActive: boolean;
    createdAt: string;
    timeLimit: number;
}

interface DetailedResponse {
    studentId: string;
    studentName: string;
    selectedOption: number;
    selectedText: string;
    isCorrect: boolean;
    submittedAt: string;
}

export default function TeacherPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("create")
    const [pollOptions, setPollOptions] = useState([
        { id: 1, text: "", isCorrect: false },
        { id: 2, text: "", isCorrect: false },
    ])
    const [questionText, setQuestionText] = useState("")
    const [timeLimit, setTimeLimit] = useState("60 seconds")
    const [isCreating, setIsCreating] = useState(false)
    const [activePolls, setActivePolls] = useState<any[]>([])
    const [pollResultsMap, setPollResultsMap] = useState<{[key: string]: PollResults}>({})
    const [pollHistory, setPollHistory] = useState<PollHistory[]>([])
    const [selectedPollDetails, setSelectedPollDetails] = useState<any>(null)
    const [detailedResponses, setDetailedResponses] = useState<DetailedResponse[]>([])
    const [loading, setLoading] = useState(false)
    const [socketService] = useState(() => SocketService.getInstance())
    const [showCreateForm, setShowCreateForm] = useState(true)
    const [showDetailedResponses, setShowDetailedResponses] = useState(false)

    useEffect(() => {
        socketService.connect()

        socketService.onPollResultsUpdated((results: PollResults) => {
            setPollResultsMap(prev => ({
                ...prev,
                [results.pollId]: results
            }))
            if (selectedPollDetails && selectedPollDetails.poll._id === results.pollId) {
                fetchDetailedResponses(results.pollId)
            }
        })

        socketService.onPollEnded(() => {
            checkActivePolls()
            fetchPollHistory()
        })

        checkActivePolls()
        fetchPollHistory()

        const pollRefreshInterval = setInterval(() => {
            checkActivePolls()
            fetchPollHistory()
        }, 3000)

        return () => {
            socketService.offPollResultsUpdated()
            socketService.offPollEnded()
            socketService.disconnect()
            clearInterval(pollRefreshInterval)
        }
    }, [socketService])

    const checkActivePolls = async () => {
        try {
            const polls = await pollAPI.getAllPolls()
            const activePolls = polls.filter((poll: any) => poll.isActive)
            setActivePolls(activePolls)
            
            if (activePolls.length > 0) {
                const resultsPromises = activePolls.map(async (poll: any) => {
                    try {
                        const results = await pollAPI.getPollResults(poll._id)
                        return { pollId: poll._id, results }
                    } catch (error) {
                        console.error(`Error fetching results for poll ${poll._id}:`, error)
                        return { pollId: poll._id, results: null }
                    }
                })
                
                const allResults = await Promise.all(resultsPromises)
                const resultsMap: {[key: string]: PollResults} = {}
                allResults.forEach(({ pollId, results }) => {
                    if (results) {
                        resultsMap[pollId] = results
                    }
                })
                setPollResultsMap(resultsMap)
            }
        } catch (error) {
            console.error('Error checking active polls:', error)
        }
    }

    const fetchPollHistory = async () => {
        try {
            const history = await pollAPI.getAllPolls()
            const sortedHistory = history.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            setPollHistory(sortedHistory)
        } catch (error) {
            console.error('Error fetching poll history:', error)
        }
    }

    const fetchDetailedResponses = async (pollId: string) => {
        try {
            setLoading(true)
            const details = await pollAPI.getDetailedResponses(pollId)
            setSelectedPollDetails(details)
            setDetailedResponses(details.responses)
        } catch (error) {
            console.error('Error fetching detailed responses:', error)
        } finally {
            setLoading(false)
        }
    }

    const handlePublishQuestion = async () => {
        if (!questionText.trim() || pollOptions.some(opt => !opt.text.trim())) {
            alert("Please fill in the question and all options")
            return
        }

        const hasCorrectAnswer = pollOptions.some(opt => opt.isCorrect)
        if (!hasCorrectAnswer) {
            alert("Please select at least one correct answer")
            return
        }

        setIsCreating(true)
        try {
            const pollData = {
                question: questionText,
                options: pollOptions.map((option, index) => ({
                    id: index + 1,
                    text: option.text,
                    isCorrect: option.isCorrect
                })),
                timeLimit: parseInt(timeLimit.split(' ')[0])
            }

            const createdPoll = await pollAPI.createPoll(pollData)
            
            setQuestionText("")
            setPollOptions([
                { id: 1, text: "", isCorrect: false },
                { id: 2, text: "", isCorrect: false },
            ])

            await fetchPollHistory()
            await checkActivePolls()
            setShowCreateForm(false)
            
            alert("Question published successfully!")
        } catch (error: any) {
            console.error('Error creating poll:', error)
            alert(error.error || "Failed to publish question")
        } finally {
            setIsCreating(false)
        }
    }

    const addOption = () => {
        setPollOptions([
            ...pollOptions,
            {
                id: pollOptions.length + 1,
                text: "",
                isCorrect: false,
            },
        ])
    }

    const updateOption = (index: number, text: string) => {
        const newOptions = [...pollOptions]
        newOptions[index].text = text
        setPollOptions(newOptions)
    }

    const setCorrectOption = (index: number, isCorrect: boolean) => {
        const newOptions = [...pollOptions]
        if (isCorrect) {
            newOptions.forEach(opt => opt.isCorrect = false)
        }
        newOptions[index].isCorrect = isCorrect
        setPollOptions(newOptions)
    }

    const handleViewResponses = (pollId: string) => {
        fetchDetailedResponses(pollId)
        setShowDetailedResponses(true)
        setShowCreateForm(false)
    }

    const handleAskNewQuestion = () => {
        setShowCreateForm(true)
        setShowDetailedResponses(false)
        setQuestionText("")
        setPollOptions([
            { id: 1, text: "", isCorrect: false },
            { id: 2, text: "", isCorrect: false },
        ])
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleString()
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Badge className="bg-[#7765DA] text-white">Live Poll</Badge>
                    </div>
                    <h1 className="text-3xl font-bold text-[#000000] mb-2">
                        {showDetailedResponses ? "Detailed Responses" : "Let's Get Started"}
                    </h1>
                    <p className="text-[#454545]">
                        {showDetailedResponses 
                            ? "View detailed responses from all students who participated in this poll."
                            : "You'll have the ability to create and manage polls, ask questions, and monitor your students' responses in real-time."
                        }
                    </p>
                </div>

                {showDetailedResponses ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <Button
                                variant="outline"
                                onClick={() => setShowDetailedResponses(false)}
                                className="border-[#7765DA] text-[#7765DA] hover:bg-[#7765DA] hover:text-white"
                            >
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                Back to Results
                            </Button>
                        </div>

                        {loading ? (
                            <Card>
                                <CardContent className="text-center py-12">
                                    <div className="animate-spin w-8 h-8 border-4 border-[#7765DA] border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-[#454545]">Loading detailed responses...</p>
                                </CardContent>
                            </Card>
                        ) : selectedPollDetails ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">{selectedPollDetails.poll?.question}</CardTitle>
                                    <div className="flex items-center gap-4 text-sm text-[#454545]">
                                        <span>Total Responses: {detailedResponses.length}</span>
                                        <span>Time Limit: {selectedPollDetails.poll?.timeLimit}s</span>
                                        <span>Created: {selectedPollDetails.poll?.createdAt ? new Date(selectedPollDetails.poll.createdAt).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {detailedResponses.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                            <p className="text-lg font-medium">No responses yet</p>
                                            <p className="text-sm mt-1">Students haven't submitted any answers for this poll.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-[#000000] mb-4">
                                                Student Responses ({detailedResponses.length} students)
                                            </h3>
                                            
                                            <div className="overflow-hidden rounded-lg border">
                                                <table className="w-full">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Student Name</th>
                                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Selected Answer</th>
                                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Result</th>
                                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Submitted At</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {detailedResponses.map((response, index) => (
                                                            <tr key={index} className="hover:bg-gray-50">
                                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                                    {response.studentName}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-6 h-6 rounded-full bg-[#7765DA] text-white flex items-center justify-center text-xs font-semibold">
                                                                            {response.selectedOption}
                                                                        </span>
                                                                        <span>{response.selectedText}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-sm">
                                                                    {response.isCorrect ? (
                                                                        <Badge className="bg-white text-white">
                                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                                            Correct
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="secondary">
                                                                            <XCircle className="w-3 h-3 mr-1" />
                                                                            Incorrect
                                                                        </Badge>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-gray-500">
                                                                    {new Date(response.submittedAt).toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            
                                            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <Card className="p-4">
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold text-green-600">
                                                            {detailedResponses.filter(r => r.isCorrect).length}
                                                        </div>
                                                        <div className="text-sm text-gray-500">Correct Answers</div>
                                                    </div>
                                                </Card>
                                                <Card className="p-4">
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold text-red-600">
                                                            {detailedResponses.filter(r => !r.isCorrect).length}
                                                        </div>
                                                        <div className="text-sm text-gray-500">Incorrect Answers</div>
                                                    </div>
                                                </Card>
                                                <Card className="p-4">
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold text-[#7765DA]">
                                                            {Math.round((detailedResponses.filter(r => r.isCorrect).length / detailedResponses.length) * 100)}%
                                                        </div>
                                                        <div className="text-sm text-gray-500">Success Rate</div>
                                                    </div>
                                                </Card>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="text-center py-12">
                                    <p className="text-[#454545]">No poll selected for detailed view.</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                ) : showCreateForm ? (
                    <div className="space-y-8">
                        {pollHistory.length > 0 && (
                            <div className="flex justify-between items-center">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCreateForm(false)}
                                    className="border-[#7765DA] text-[#7765DA] hover:bg-[#7765DA] hover:text-white"
                                >
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    View All Results
                                </Button>
                            </div>
                        )}
                        
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <Label className="text-[#000000] font-semibold">Enter your question</Label>
                                <label htmlFor="timeLimit" className="sr-only">Time limit</label>
                                <select
                                    id="timeLimit"
                                    value={timeLimit}
                                    onChange={(e) => setTimeLimit(e.target.value)}
                                    className="border border-[#d9d9d9] rounded px-3 py-1 text-sm"
                                >
                                    <option>30 seconds</option>
                                    <option>60 seconds</option>
                                    <option>90 seconds</option>
                                    <option>120 seconds</option>
                                </select>
                            </div>
                            <textarea
                                value={questionText}
                                onChange={(e) => setQuestionText(e.target.value)}
                                placeholder="Enter your question here..."
                                className="w-full h-32 p-4 border border-[#d9d9d9] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#7765DA] focus:border-transparent"
                                maxLength={100}
                            />
                            <div className="text-right text-sm text-[#454545] mt-1">{questionText.length}/100</div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-[#000000] font-semibold mb-4">Edit Options</h3>
                                <div className="space-y-4">
                                    {pollOptions.map((option, index) => (
                                        <div key={option.id} className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-[#7765DA] text-white flex items-center justify-center text-sm font-semibold">
                                                {index + 1}
                                            </div>
                                            <Input
                                                value={option.text}
                                                onChange={(e) => updateOption(index, e.target.value)}
                                                placeholder="Enter option text"
                                                className="flex-1 border-[#d9d9d9]"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    className="mt-4 border-[#7765DA] text-[#7765DA] hover:bg-[#7765DA] hover:text-white bg-transparent"
                                    onClick={addOption}
                                >
                                    + Add More option
                                </Button>
                            </div>

                            <div>
                                <h3 className="text-[#000000] font-semibold mb-4">Is it Correct?</h3>
                                <div className="space-y-2">
                                    {pollOptions.map((option, index) => (
                                        <Card
                                            key={option.id}
                                            className="p-3 no-border"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`correct-${option.id}`}
                                                            checked={option.isCorrect === true}
                                                            onChange={() => setCorrectOption(index, true)}
                                                            className="w-4 h-4 text-[#7765DA]"
                                                        />
                                                        <span className="text-[#000000]">Yes</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`correct-${option.id}`}
                                                            checked={option.isCorrect === false}
                                                            onChange={() => setCorrectOption(index, false)}
                                                            className="w-4 h-4 text-[#7765DA]"
                                                        />
                                                        <span className="text-[#000000]">No</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                className="bg-[#7765DA] hover:bg-[#480fb3] text-white px-8 py-3 text-lg"
                                onClick={handlePublishQuestion}
                                disabled={!questionText.trim() || pollOptions.some((opt) => !opt.text.trim()) || isCreating}
                            >
                                {isCreating ? "Publishing..." : "Ask Question"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <Button
                                variant="outline"
                                onClick={() => setShowCreateForm(true)}
                                className="border-[#7765DA] text-[#7765DA] hover:bg-[#7765DA] hover:text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create New Question
                            </Button>
                            <div className="text-sm text-[#454545]">
                                {pollHistory.length} total poll{pollHistory.length !== 1 ? 's' : ''} • {activePolls.length} active
                            </div>
                        </div>

                        {pollHistory.length > 0 ? (
                            <div className="space-y-6">
                                {pollHistory.map((poll, index) => (
                                    <Card key={poll._id} className="overflow-hidden border-0 shadow-lg">
                                        <div className="bg-gradient-to-r from-[#373737] to-[#6E6E6E] text-white px-6 py-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-medium text-lg mb-2">Question {index + 1}: {poll.question}</h4>
                                                    <div className="flex items-center gap-4 text-sm text-gray-300">
                                                        <span>Time Limit: {poll.timeLimit}s</span>
                                                        <span>Created: {new Date(poll.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <Badge 
                                                    className={poll.isActive ? "bg-green-500 text-white" : "bg-gray-400 text-white"}
                                                >
                                                    {poll.isActive ? "Active" : "Closed"}
                                                </Badge>
                                            </div>
                                        </div>
                                        
                                        <CardContent className="p-6">
                                            {poll.isActive && pollResultsMap[poll._id] ? (
                                                <>
                                                    <div className="space-y-3">
                                                        {pollResultsMap[poll._id].options.map((option, optionIndex) => (
                                                            <div key={option.id} className="rounded-lg border border-gray-200 overflow-hidden relative">
                                                                <div 
                                                                    className="absolute inset-0 bg-[#7765DA] transition-all duration-500 ease-out"
                                                                    style={{ width: `${option.percentage || 0}%` }}
                                                                ></div>
                                                                
                                                                <div className="relative flex items-center justify-between p-4 min-h-[60px]">
                                                                    <div className="flex items-center">
                                                                        <div className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center text-sm font-semibold mr-3 flex-shrink-0 shadow-sm">
                                                                            {optionIndex + 1}
                                                                        </div>
                                                                        
                                                                        <span className="font-medium text-gray-900">{option.text}</span>
                                                                    </div>
                                                                    
                                                                    <div className="flex-shrink-0">
                                                                        <span className="font-bold text-gray-900">{option.percentage || 0}%</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                        <div className="flex items-center justify-center gap-2 text-gray-600">
                                                            <Users className="w-5 h-5" />
                                                            <span className="font-medium">{pollResultsMap[poll._id].totalVotes} total responses</span>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : poll.options ? (
                                                <>
                                                    <div className="space-y-3">
                                                        {poll.options.map((option: any, optionIndex: number) => {
                                                            const percentage = poll.totalVotes > 0 ? 
                                                                Math.round((option.votes / poll.totalVotes) * 100) : 0;
                                                            
                                                            return (
                                                                <div key={option.id} className="rounded-lg border border-gray-200 overflow-hidden relative">
                                                                    <div 
                                                                        className={`absolute inset-0 transition-all duration-500 ease-out ${
                                                                            option.isCorrect ? 'bg-[#7765DA]' : 'bg-gray-300'
                                                                        }`}
                                                                        style={{ width: `${percentage}%` }}
                                                                    ></div>
                                                                    <div className="relative flex items-center justify-between p-4 min-h-[60px]">
                                                                        <div className="flex items-center">
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mr-3 flex-shrink-0 shadow-sm ${
                                                                                option.isCorrect 
                                                                                    ? 'bg-white text-gray-600' 
                                                                                    : 'bg-white text-gray-600 border'
                                                                            }`}>
                                                                                {String.fromCharCode(65 + optionIndex)}
                                                                            </div>
                                                                            <span className="font-medium text-gray-900">{option.text}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            {option.isCorrect && (
                                                                                <Badge className="bg-white text-gray-600 text-xs">
                                                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                                                    Correct
                                                                                </Badge>
                                                                            )}
                                                                            <span className="font-bold text-gray-900">
                                                                                {option.votes || 0} ({percentage}%)
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                        <div className="flex items-center justify-center gap-2 text-gray-600">
                                                            <Users className="w-5 h-5" />
                                                            <span className="font-medium">{poll.totalVotes || 0} total responses</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex gap-2 justify-center mt-4">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => handleViewResponses(poll._id)}
                                                            className="border-[#7765DA] text-[#7765DA] hover:bg-[#7765DA] hover:text-white"
                                                        >
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            View Detailed Responses
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center py-12 text-gray-500">
                                                    <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                                    <p className="text-lg font-medium">No responses yet</p>
                                                    <p className="text-sm mt-1">Students can now submit their answers!</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <h2 className="text-2xl font-bold mb-4 text-[#000000]">No Polls Yet</h2>
                                <p className="text-[#454545] mb-8">Create your first question to start engaging with students.</p>
                            </div>
                        )}

                        <div className="text-center">
                            <Button
                                onClick={handleAskNewQuestion}
                                className="bg-[#7765DA] hover:bg-[#480fb3] text-white px-8 py-3 text-lg"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Ask Another Question
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
