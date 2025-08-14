import * as React from "react"

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <div className="min-h-screen bg-background font-sans antialiased [&_.dark]:bg-gray-950 [&_.dark]:text-gray-50">
      {children}
    </div>
  )
}
