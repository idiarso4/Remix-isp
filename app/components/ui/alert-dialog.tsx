import * as React from "react"
import { cn } from "~/lib/utils"
import { X } from "lucide-react"

interface AlertDialogProps {
  children: React.ReactNode
}

interface AlertDialogTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface AlertDialogContentProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogHeaderProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogFooterProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogTitleProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

interface AlertDialogCancelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

const AlertDialogContext = React.createContext<{
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}>({
  isOpen: false,
  setIsOpen: () => {}
})

const AlertDialog: React.FC<AlertDialogProps> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  return (
    <AlertDialogContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            {React.Children.map(children, child => {
              if (React.isValidElement(child) && child.type === AlertDialogContent) {
                return child
              }
              return null
            })}
          </div>
        </div>
      )}
    </AlertDialogContext.Provider>
  )
}

const AlertDialogTrigger: React.FC<AlertDialogTriggerProps> = ({ children, asChild }) => {
  const { setIsOpen } = React.useContext(AlertDialogContext)
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      onClick: (e: React.MouseEvent) => {
        children.props.onClick?.(e)
        setIsOpen(true)
      }
    })
  }
  
  return (
    <button onClick={() => setIsOpen(true)}>
      {children}
    </button>
  )
}

const AlertDialogContent: React.FC<AlertDialogContentProps> = ({ children, className }) => {
  const { isOpen, setIsOpen } = React.useContext(AlertDialogContext)
  
  if (!isOpen) return null
  
  return (
    <div className={cn("p-6", className)}>
      <button
        onClick={() => setIsOpen(false)}
        className="absolute top-4 right-4 p-1 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  )
}

const AlertDialogHeader: React.FC<AlertDialogHeaderProps> = ({ children, className }) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left mb-4", className)}>
    {children}
  </div>
)

const AlertDialogFooter: React.FC<AlertDialogFooterProps> = ({ children, className }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4", className)}>
    {children}
  </div>
)

const AlertDialogTitle: React.FC<AlertDialogTitleProps> = ({ children, className }) => (
  <h2 className={cn("text-lg font-semibold", className)}>
    {children}
  </h2>
)

const AlertDialogDescription: React.FC<AlertDialogDescriptionProps> = ({ children, className }) => (
  <p className={cn("text-sm text-gray-500", className)}>
    {children}
  </p>
)

const AlertDialogAction: React.FC<AlertDialogActionProps> = ({ children, className, onClick, ...props }) => {
  const { setIsOpen } = React.useContext(AlertDialogContext)
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    setIsOpen(false)
  }
  
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
}

const AlertDialogCancel: React.FC<AlertDialogCancelProps> = ({ children, className, onClick, ...props }) => {
  const { setIsOpen } = React.useContext(AlertDialogContext)
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    setIsOpen(false)
  }
  
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4 mt-2 sm:mt-0",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}