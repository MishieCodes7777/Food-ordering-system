import { useState, useLayoutEffect, useCallback } from 'react';
import { ArrowUp, X } from 'lucide-react';
import Stepper, { Step } from './Stepper.jsx';

// Steps that point at a real navbar element, keyed by that element's id.
// Position is measured live via getBoundingClientRect rather than hardcoded
// pixels, so the arrow always lines up with wherever the element actually
// renders — hardcoded positions drifted out of sync with the real navbar
// layout (e.g. "Menu" and "Orders" sit at different x positions but used
// to share one hardcoded "center" spot).
const STEP_TARGETS = {
    2: { id: 'nav-item-menu', text: 'Menu button in the navbar' },
    4: { id: 'nav-item-cart', text: 'Cart icon in the navbar' },
    5: { id: 'nav-item-orders', text: 'Orders in the navbar' },
};

const ARROW_GAP = 12; // px between the target element and the arrow tip

const Onboarding = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [arrowPos, setArrowPos] = useState(null);

    const target = STEP_TARGETS[currentStep];

    const updatePosition = useCallback(() => {
        const el = target && document.getElementById(target.id);
        const rect = el?.getBoundingClientRect();
        // No target for this step, or the element is hidden (e.g. the desktop
        // navbar is display:none on mobile) — skip the arrow rather than
        // point it at a wrong/zero-size spot.
        if (!rect || rect.width === 0) {
            setArrowPos(null);
            return;
        }
        setArrowPos({ left: rect.left + rect.width / 2, top: rect.bottom + ARROW_GAP });
    }, [target]);

    useLayoutEffect(() => {
        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [updatePosition]);

    return (
        <div className="onboarding-overlay">
            {/* Skip button — sits below the navbar so it doesn't overlap the
                profile/cart icons up there */}
            <button
                onClick={onComplete}
                className="fixed top-20 right-4 z-[1001] bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition-all flex items-center gap-1.5"
            >
                <X size={14} /> Skip
            </button>

            {/* Arrow indicator, dynamically positioned under its real target */}
            {target && arrowPos && (
                <div
                    className="onboarding-arrow"
                    style={{ left: arrowPos.left, top: arrowPos.top, transform: 'translateX(-50%)' }}
                >
                    <ArrowUp size={28} className="text-white animate-bounce" />
                    <span className="onboarding-arrow-text">{target.text}</span>
                </div>
            )}

            {/* Stepper */}
            <Stepper
                initialStep={1}
                nextButtonText="Next"
                backButtonText="Back"
                onStepChange={(step) => setCurrentStep(step)}
                onFinalStepCompleted={onComplete}
            >
                <Step>
                    <h2>Welcome to Akio</h2>
                    <p>A quick walkthrough to help you start ordering food. This will only take a moment.</p>
                </Step>
                <Step>
                    <h2>Browse the Menu</h2>
                    <p>Tap <strong>Menu</strong> in the navigation bar above to explore food categories and search for dishes.</p>
                </Step>
                <Step>
                    <h2>Add Items to Cart</h2>
                    <p>Found something you like? Tap the <strong>+</strong> button on any item. Use <strong>-</strong> and <strong>+</strong> to adjust the quantity.</p>
                </Step>
                <Step>
                    <h2>Place Your Order</h2>
                    <p>Go to your <strong>Cart</strong>, review items and total, then tap <strong>Place Order</strong> to pay securely.</p>
                </Step>
                <Step>
                    <h2>Track Orders</h2>
                    <p>Visit <strong>Orders</strong> to see real-time status updates. You can cancel pending orders if needed.</p>
                </Step>
                <Step>
                    <h2>You're ready</h2>
                    <p>That's everything. Enjoy your meal and happy ordering!</p>
                </Step>
            </Stepper>
        </div>
    );
};

export default Onboarding;
