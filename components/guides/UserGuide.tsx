'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { allGuideSteps, GuideStep } from './guide-steps';
import Button from '../ui/Button';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

const UserGuide: React.FC = () => {
    const { activeGuide, guideStep, endGuide, goToNextGuideStep, goToPrevGuideStep } = useAppContext();
    const router = useRouter();
    const pathname = usePathname();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
    const [isVisible, setIsVisible] = useState(false);
    const [isActionPending, setIsActionPending] = useState(false);
    const { addToast } = useToast();

    const guideSteps = activeGuide ? allGuideSteps[activeGuide] : [];
    const currentStep: GuideStep | undefined = guideSteps[guideStep];
    const highlightRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Reset action state when step changes
        setIsActionPending(!!currentStep?.action);
    }, [currentStep]);
 
    const performAction = useCallback((action: NonNullable<GuideStep['action']>, element: HTMLElement, step: GuideStep) => {
        setTimeout(() => {
            if (action.type === 'click') {
                element.click();
            } else if (action.type === 'fillInput' || action.type === 'select') {
                const nativeSetter = Object.getOwnPropertyDescriptor(
                    element.tagName === 'SELECT' 
                        ? window.HTMLSelectElement.prototype 
                        : window.HTMLInputElement.prototype, 
                    'value'
                )?.set;
                
                if (nativeSetter && action.value !== undefined) {
                    nativeSetter.call(element, action.value);
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

        }, 800); // Delay to let user read popover before action
    }, []);

    useEffect(() => {
        if (!currentStep) {
            endGuide();
            return;
        }

        // Navigate if the route is different
        if (currentStep.route && pathname !== currentStep.route) {
            router.push(currentStep.route);
            setTargetRect(null); 
            setIsVisible(false);
            return;
        }
        
        const maxAttempts = 25; // 25 * 200ms = 5 seconds timeout
        let attempts = 0;

        const updateAndAct = () => {
            const targetElement = document.querySelector(currentStep.targetElementSelector) as HTMLElement;
            if (targetElement) {
                const rect = targetElement.getBoundingClientRect();
                setTargetRect(rect);
                
                // Position popover
                let top = 0, left = 0;
                const margin = 10;
                switch (currentStep.placement) {
                    case 'bottom': top = rect.bottom + margin; left = rect.left + rect.width / 2; break;
                    case 'top': top = rect.top - margin; left = rect.left + rect.width / 2; break;
                    case 'left': top = rect.top + rect.height / 2; left = rect.left - margin; break;
                    case 'right': default: top = rect.top + rect.height / 2; left = rect.right + margin; break;
                }
                setPopoverPos({ top, left });
                setIsVisible(true);
                
                if (isActionPending && currentStep.action) {
                    setIsActionPending(false); // Consume action
                    performAction(currentStep.action, targetElement, currentStep);
                }

            } else {
                 attempts++;
                 if (attempts < maxAttempts) {
                    setTimeout(updateAndAct, 200);
                 } else {
                    console.error(`UserGuide: Could not find element "${currentStep.targetElementSelector}" for step ${guideStep}. Ending guide.`);
                    addToast({type: 'error', message: 'Guide element not found. Ending tour.'});
                    endGuide();
                 }
            }
        };

        const timeoutId = setTimeout(updateAndAct, 100);
        return () => clearTimeout(timeoutId);

    }, [guideStep, activeGuide, pathname, isActionPending, router, endGuide, currentStep, performAction, addToast]);

    if (!currentStep) return null;

    const getTransformValue = () => {
        switch (currentStep.placement) {
            case 'top': return 'translate(-50%, -100%)';
            case 'bottom': return 'translate(-50%, 0)';
            case 'left': return 'translate(-100%, -50%)';
            case 'right': return 'translate(0, -50%)';
            default: return 'translate(-50%, -50%)';
        }
    };
    
    const popoverStyle: React.CSSProperties = {
        top: `${popoverPos.top}px`,
        left: `${popoverPos.left}px`,
        position: 'fixed',
        transform: getTransformValue(),
        opacity: isVisible && targetRect ? 1 : 0,
    };

    return (
        <div className="fixed inset-0 z-[9997] pointer-events-none">
            <div
                ref={highlightRef}
                className="guide-highlight"
                style={{
                    width: `${targetRect ? targetRect.width + 10 : 0}px`,
                    height: `${targetRect ? targetRect.height + 10 : 0}px`,
                    top: `${targetRect ? targetRect.top - 5 : '50%'}px`,
                    left: `${targetRect ? targetRect.left - 5 : '50%'}px`,
                    opacity: targetRect && isVisible ? 1 : 0,
                }}
            />
            <div style={popoverStyle} className={`guide-popover ${isVisible && targetRect ? 'visible' : ''}`}>
                <div className="bg-card text-card-foreground rounded-lg shadow-2xl w-80 border border-primary pointer-events-auto">
                    <div className="p-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg text-foreground">{currentStep.title}</h3>
                             <button onClick={endGuide} className="text-muted-foreground hover:text-foreground">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground">{currentStep.content}</p>
                    </div>
                    <div className="bg-muted/50 p-3 flex justify-between items-center rounded-b-lg">
                        <span className="text-xs font-medium text-muted-foreground">
                            Step {guideStep + 1} of {guideSteps.length}
                        </span>
                        <div className="flex items-center space-x-2">
                            {guideStep > 0 && (
                                <Button size="sm" variant="secondary" onClick={goToPrevGuideStep}>
                                    <ArrowLeft className="h-4 w-4 mr-1" />
                                    Back
                                </Button>
                            )}
                            {guideStep < guideSteps.length - 1 ? (
                                <Button size="sm" onClick={goToNextGuideStep}>
                                    Next
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                            ) : (
                                <Button size="sm" onClick={endGuide}>
                                    Finish
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserGuide;