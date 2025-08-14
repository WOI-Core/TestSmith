"use client"
import Link from "next/link"
import { useState, useEffect } from "react"
import { ArrowRight, Code, Trophy, Users, Zap, Star, TrendingUp, BookOpen, Play, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function HomePage() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  const features = [
    {
      icon: <Code className="h-8 w-8 text-purple-600" />,
      title: "500+ Problems",
      description: "Curated collection of programming challenges from beginner to expert level",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: <Trophy className="h-8 w-8 text-purple-600" />,
      title: "Real-time Judging",
      description: "Get instant feedback on your submissions with detailed test case results",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: <Users className="h-8 w-8 text-purple-600" />,
      title: "Active Community",
      description: "Learn from others, share solutions, and participate in discussions",
      color: "from-green-500 to-green-600",
    },
    {
      icon: <Zap className="h-8 w-8 text-purple-600" />,
      title: "Performance Analytics",
      description: "Track your progress with detailed statistics and performance insights",
      color: "from-orange-500 to-orange-600",
    },
  ]

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Software Engineer at Google",
      avatar: "SC",
      content:
        "GraderSmith helped me prepare for technical interviews. The problems are well-curated and the explanations are excellent!",
      rating: 5,
    },
    {
      name: "Alex Rodriguez",
      role: "CS Student at MIT",
      avatar: "AR",
      content:
        "The community here is amazing. I've learned so much from the discussions and different solution approaches.",
      rating: 5,
    },
    {
      name: "David Kim",
      role: "Senior Developer at Microsoft",
      avatar: "DK",
      content:
        "Perfect platform for staying sharp with algorithms. I use it regularly to practice and learn new techniques.",
      rating: 5,
    },
  ]

  const achievements = [
    { icon: <Users className="h-6 w-6" />, label: "Active Users", value: "50K+", color: "text-blue-600" },
    { icon: <Code className="h-6 w-6" />, label: "Problems Solved", value: "2M+", color: "text-green-600" },
    { icon: <Trophy className="h-6 w-6" />, label: "Contests Held", value: "100+", color: "text-purple-600" },
    { icon: <Star className="h-6 w-6" />, label: "Success Rate", value: "94%", color: "text-yellow-600" },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [testimonials.length])



  return (
    <div className="h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 overflow-hidden">
      <div className="h-full flex items-center justify-center">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-8">
              <Zap className="h-4 w-4 mr-2" />
              Join 50,000+ Programmers Worldwide
            </div>

            {/* Main Title */}
            <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Master
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-800">
                {" "}
                Competitive{" "}
              </span>
              Programming
            </h1>

            {/* Description */}
            <p className="text-xl lg:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              Sharpen your coding skills with our comprehensive collection of programming challenges. Practice, compete,
              and grow with GraderSmith&apos;s modern platform.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button
                asChild
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg group"
              >
                <Link href="/problems">
                  Start Solving Problems
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-purple-200 text-purple-700 hover:bg-purple-50 px-8 py-4 text-lg bg-white/80 backdrop-blur-sm"
              >
                <Link href="/leaderboard">
                  <Trophy className="mr-2 h-5 w-5" />
                  View Leaderboard
                </Link>
              </Button>
            </div>

            {/* Achievement Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg"
                >
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-white mb-4 ${achievement.color}`}
                  >
                    {achievement.icon}
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{achievement.value}</div>
                  <div className="text-sm text-gray-600">{achievement.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Why Choose GraderSmith?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to excel in competitive programming and technical interviews
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group"
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-full w-fit group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 leading-relaxed">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600">Join thousands of satisfied programmers</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="border-0 shadow-2xl bg-gradient-to-r from-purple-50 to-blue-50">
              <CardContent className="p-8 lg:p-12">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                      <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                    ))}
                  </div>

                  <blockquote className="text-xl lg:text-2xl text-gray-700 mb-8 leading-relaxed italic">
                    &quot;{testimonials[currentTestimonial].content}&quot;
                  </blockquote>

                  <div className="flex items-center justify-center space-x-4">
                    <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                      <AvatarFallback className="bg-purple-100 text-purple-700 text-lg font-bold">
                        {testimonials[currentTestimonial].avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900 text-lg">{testimonials[currentTestimonial].name}</div>
                      <div className="text-gray-600">{testimonials[currentTestimonial].role}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial Indicators */}
            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentTestimonial ? "bg-purple-600" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-purple-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-700/10 to-purple-900/10" />

        <div className="relative container mx-auto px-4 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">Ready to Start Your Journey?</h2>
          <p className="text-xl lg:text-2xl mb-8 max-w-3xl mx-auto opacity-90">
            Join thousands of programmers who are already improving their skills with GraderSmith
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="bg-white text-purple-700 hover:bg-gray-100 px-8 py-4 text-lg group">
              <Link href="/signup">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white/10 px-8 py-4 text-lg bg-transparent"
            >
              <Link href="/problems">
                <BookOpen className="mr-2 h-5 w-5" />
                Browse Problems
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
