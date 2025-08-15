"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function Home() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState("")

  const handleGetStarted = () => {
    if (selectedRole === "student") {
      router.push("/loginpage?role=student")
    } else if (selectedRole === "teacher") {
      router.push("/teacherpage")
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="flex justify-center">
          <Badge className="bg-[#7765DA] text-white">Live Poll</Badge>
        </div>
        
        <Card className="w-full max-w-2xl mx-auto no-border">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-[#000000]">
              <span className="font-normal">Welcome to the </span>
              <span className="font-bold">Live Polling System</span>
            </CardTitle>
            <p className="text-[#454545] mt-2">
              Please select the role that best describes you to begin using the live polling system
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                className={`p-4 border-2 cursor-pointer transition-colors ${
                  selectedRole === "student"
                    ? "border-[#7765DA] bg-[#f8f6ff]"
                    : "border-[#d9d9d9] hover:border-[#7765DA]"
                }`}
                onClick={() => setSelectedRole("student")}
              >
                <div className="text-center">
                  <h3 className="font-semibold text-[#000000]">I'm a Student</h3>
                  <p className="text-sm text-[#454545] mt-1">Join and participate in live polls</p>
                </div>
              </Card>

              <Card
                className={`p-4 border-2 cursor-pointer transition-colors ${
                  selectedRole === "teacher"
                    ? "border-[#7765DA] bg-[#f8f6ff]"
                    : "border-[#d9d9d9] hover:border-[#7765DA]"
                }`}
                onClick={() => setSelectedRole("teacher")}
              >
                <div className="text-center">
                  <h3 className="font-semibold text-[#000000]">I'm a Teacher</h3>
                  <p className="text-sm text-[#454545] mt-1">Create and manage live polls</p>
                </div>
              </Card>
            </div>

            <div className="flex justify-center">
              <Button
                className="rounded-full bg-[#7765DA] hover:bg-[#480fb3] text-white border-2 border-[#7765DA] px-6 py-2"
                onClick={handleGetStarted}
                disabled={!selectedRole}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
