"use client";

import React, { useState, useEffect } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface TourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  currentStep: number;
}

export function Tour({ 
  steps, 
  isOpen, 
  onClose, 
  onNext, 
  onPrevious, 
  currentStep 
}: TourProps) {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen && steps[currentStep]) {
      const element = document.querySelector(steps[currentStep].target) as HTMLElement;
      setTargetElement(element);
    }
  }, [isOpen, currentStep, steps]);

  if (!isOpen || !steps[currentStep]) {
    return null;
  }

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>{currentStepData.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {currentStepData.content}
          </p>
          <div className="flex justify-between">
            <div className="flex gap-2">
              {!isFirstStep && (
                <Button variant="outline" onClick={onPrevious}>
                  Previous
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                Skip Tour
              </Button>
            </div>
            <Button onClick={isLastStep ? onClose : onNext}>
              {isLastStep ? "Finish" : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for managing tour state
export function useTour(steps: TourStep[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const startTour = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  const closeTour = () => {
    setIsOpen(false);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      closeTour();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return {
    isOpen,
    currentStep,
    startTour,
    closeTour,
    nextStep,
    previousStep,
  };
}