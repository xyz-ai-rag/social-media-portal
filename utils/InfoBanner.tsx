"use client";

import React from 'react';
import { 
  FaInfoCircle, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaTimesCircle 
} from 'react-icons/fa';

interface InfoBannerProps {
  variant?: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  message: string | React.ReactNode; // Support both string and React nodes
  className?: string;
  isModal?: boolean;
  forceInfoIcon?: boolean; // Add this prop to force info icon regardless of variant
}

const variantStyles = {
  info: {
    backgroundColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600'
  },
  warning: {
    backgroundColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
    iconColor: 'text-amber-600'
  },
  success: {
    backgroundColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-600'
  },
  error: {
    backgroundColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-600'
  }
};

const variantIcons = {
  info: FaInfoCircle,
  warning: FaExclamationTriangle,
  success: FaCheckCircle,
  error: FaTimesCircle
};

export default function InfoBanner({ 
  variant = 'info', 
  title, 
  message, 
  className = '',
  isModal = false,
  forceInfoIcon = false
}: InfoBannerProps) {
  const styles = variantStyles[variant];
  
  // Use info icon if forceInfoIcon is true, otherwise use variant-specific icon
  const IconComponent = forceInfoIcon ? variantIcons.info : variantIcons[variant];
  
  // Keep the original variant color even when forcing info icon
  const iconColor = styles.iconColor; // Always use the variant's color, not info color

  // Modal-specific styling
  const modalClasses = isModal 
    ? "p-3 text-left" // Reduced padding for modal
    : "p-4"; // Default padding

  const textSizeClasses = isModal 
    ? "text-xs" // Smaller text for modal
    : "text-sm"; // Default text size

  const iconSizeClasses = isModal 
    ? "h-4 w-4" // Smaller icon for modal
    : "h-5 w-5"; // Default icon size

  return (
    <div 
      className={`
        ${styles.backgroundColor} 
        ${styles.borderColor} 
        ${styles.textColor}
        border rounded-lg flex items-start space-x-3 
        w-full max-w-full
        ${modalClasses}
        ${className}
      `}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        <IconComponent 
          className={`${iconSizeClasses} ${iconColor}`} 
          aria-hidden="true" 
        />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className={`${textSizeClasses} font-medium ${styles.textColor} ${isModal ? 'mb-0.5' : 'mb-1'}`}>
            {title}
          </h3>
        )}
        <p className={`${textSizeClasses} ${styles.textColor} leading-relaxed`}>
          {message}
        </p>
      </div>
    </div>
  );
}

// Example usage component to show different variants
export function InfoBannerExamples() {
  return (
    <div className="space-y-4 p-6">
      <InfoBanner
        variant="info"
        title="Data Update Information"
        message="Data is updated daily for paid tiers. Data is updated every three days for free tier. Last update time was June 30, 2025. Upgrade to get live data, updated daily."
      />
      
      <InfoBanner
        variant="warning"
        title="System Maintenance"
        message="Scheduled maintenance will occur tonight from 11 PM to 1 AM EST. Some features may be temporarily unavailable during this time."
      />
      
      <InfoBanner
        variant="success"
        title="Data Sync Complete"
        message="All competitor data has been successfully synchronized. Your dashboard now shows the latest information."
      />
      
      <InfoBanner
        variant="error"
        title="Connection Error"
        message="Unable to fetch the latest data. Please check your internet connection and try again."
      />
      
      {/* Example without title */}
      <InfoBanner
        variant="info"
        message="This is a simple informational message without a title."
      />

      {/* Modal examples */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Modal Versions (Compact)</h2>
        <div className="space-y-3">
          <InfoBanner
            variant="info"
            title="Modal Banner"
            message="This is how the banner looks in a modal context with reduced padding and smaller text."
            isModal={true}
          />
          
          <InfoBanner
            variant="warning"
            message="Modal banner without title - more compact for modal usage."
            isModal={true}
          />
        </div>
      </div>
    </div>
  );
}