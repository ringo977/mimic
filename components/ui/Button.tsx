import { ReactNode } from 'react';
import Link from 'next/link';

interface ButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export default function Button({ 
  children, 
  href, 
  onClick, 
  variant = 'primary', 
  className = '',
  type = 'button'
}: ButtonProps) {
  const baseStyles = 'px-6 py-3 rounded-lg font-manrope font-semibold transition-all duration-300 inline-flex items-center justify-center';
  
  const variantStyles = {
    primary: 'bg-polimi-bright-blue hover:bg-polimi-blue-heritage text-white shadow-md hover:shadow-lg transform hover:scale-105',
    secondary: 'bg-polimi-blue-heritage hover:bg-polimi-blue-heritage/90 text-white shadow-md hover:shadow-lg',
    outline: 'border-2 border-polimi-blue-heritage text-polimi-blue-heritage hover:bg-polimi-blue-heritage hover:text-white',
  };

  const classes = `${baseStyles} ${variantStyles[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
