import React from 'react';

type IconProps = {
  className?: string;
};

const SuccessIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default SuccessIcon;
