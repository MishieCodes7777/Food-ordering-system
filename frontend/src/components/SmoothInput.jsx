import { motion } from 'motion/react';
import { useState } from 'react';
import './SmoothInput.css';

const SmoothInput = ({
  type = 'text',
  value,
  defaultValue = '',
  onChange,
  onBlur,
  onFocus,
  placeholder = '',
  className = '',
  wrapperClassName = '',
  label,
  id,
  required,
  minLength,
  disabled,
  rightElement,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);

  const isControlled = value !== undefined;
  const inputValue = isControlled ? String(value) : internalValue;

  return (
    <div className={`smooth-input-wrapper ${wrapperClassName}`}>
      {label && <label htmlFor={id} className="smooth-input-label">{label}{required && ' *'}</label>}
      <motion.div
        className="smooth-input-container"
        animate={{
          borderColor: isFocused ? '#1a3c34' : '#e5e7eb',
          boxShadow: isFocused ? '0 0 0 3px rgba(26, 60, 52, 0.08)' : '0 0 0 0px transparent',
        }}
        transition={{ duration: 0.2 }}
      >
        <motion.input
          {...props}
          id={id}
          type={type}
          placeholder={placeholder}
          className={`smooth-input ${rightElement ? 'smooth-input-with-right-el' : ''} ${className}`}
          value={inputValue}
          required={required}
          minLength={minLength}
          disabled={disabled}
          onChange={(e) => {
            if (!isControlled) setInternalValue(e.target.value);
            onChange?.(e);
          }}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          animate={{
            backgroundColor: isFocused ? 'rgba(26, 60, 52, 0.02)' : 'transparent',
          }}
          transition={{ duration: 0.15 }}
        />
        {rightElement && <div className="smooth-input-right-el">{rightElement}</div>}
        {/* Animated underline */}
        <motion.div
          className="smooth-input-underline"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isFocused ? 1 : 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </motion.div>
    </div>
  );
};

export default SmoothInput;
