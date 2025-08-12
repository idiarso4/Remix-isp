import { ReactNode, useState } from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

interface WizardStep {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
  isValid?: boolean;
}

interface FormWizardProps {
  steps: WizardStep[];
  onComplete: (data: Record<string, any>) => void;
  onStepChange?: (stepIndex: number) => void;
  className?: string;
}

export function FormWizard({ 
  steps, 
  onComplete, 
  onStepChange,
  className 
}: FormWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<Record<string, any>>({});

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
      onStepChange?.(stepIndex);
    }
  };

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      goToStep(currentStep + 1);
    }
  };

  const goPrevious = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    onComplete(formData);
  };

  const isStepCompleted = (stepIndex: number) => completedSteps.has(stepIndex);
  const isStepActive = (stepIndex: number) => stepIndex === currentStep;
  const canGoNext = steps[currentStep]?.isValid !== false;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className={cn("max-w-4xl mx-auto", className)}>
      {/* Step Indicator */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, index) => (
              <li key={step.id} className={cn(
                "relative",
                index !== steps.length - 1 && "pr-8 sm:pr-20 flex-1"
              )}>
                {/* Connector Line */}
                {index !== steps.length - 1 && (
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className={cn(
                      "h-0.5 w-full",
                      isStepCompleted(index) ? "bg-blue-600" : "bg-gray-200"
                    )} />
                  </div>
                )}

                {/* Step Circle */}
                <button
                  onClick={() => goToStep(index)}
                  className={cn(
                    "relative w-8 h-8 flex items-center justify-center rounded-full border-2 transition-colors",
                    isStepActive(index)
                      ? "border-blue-600 bg-blue-600 text-white"
                      : isStepCompleted(index)
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 bg-white text-gray-500 hover:border-gray-400"
                  )}
                >
                  {isStepCompleted(index) ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </button>

                {/* Step Label */}
                <div className="mt-2">
                  <p className={cn(
                    "text-sm font-medium",
                    isStepActive(index) ? "text-blue-600" : "text-gray-500"
                  )}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-400 mt-1">
                      {step.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {steps[currentStep]?.title}
          </h2>
          {steps[currentStep]?.description && (
            <p className="text-gray-600 mt-1">
              {steps[currentStep].description}
            </p>
          )}
        </div>
        
        <div className="min-h-[400px]">
          {steps[currentStep]?.content}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={goPrevious}
          disabled={currentStep === 0}
          className="flex items-center"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Sebelumnya
        </Button>

        <div className="flex space-x-2">
          {isLastStep ? (
            <Button
              onClick={handleComplete}
              disabled={!canGoNext}
              className="flex items-center"
            >
              Selesai
              <Check className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canGoNext}
              className="flex items-center"
            >
              Selanjutnya
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}