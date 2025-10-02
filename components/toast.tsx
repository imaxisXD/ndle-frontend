"use client"

import { useEffect, useState } from "react"
import { CheckCircle2Icon, AlertCircleIcon, X } from "./icons"

export type ToastType = "success" | "error" | "info"

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(onClose, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle2Icon className="h-5 w-5 text-green-600" />
      case "error":
        return <AlertCircleIcon className="h-5 w-5 text-red-600" />
      case "info":
        return (
          <svg
            className="h-5 w-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
    }
  }

  const getBgColor = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200"
      case "error":
        return "bg-red-50 border-red-200"
      case "info":
        return "bg-blue-50 border-blue-200"
    }
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 ${getBgColor()} ${
        isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      }`}
    >
      {getIcon()}
      <p className="flex-1 font-mono text-sm">{message}</p>
      <button onClick={() => setIsExiting(true)} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastContainer({ toasts }: { toasts: Array<{ id: string; message: string; type: ToastType }> }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-96">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => {}} />
      ))}
    </div>
  )
}
