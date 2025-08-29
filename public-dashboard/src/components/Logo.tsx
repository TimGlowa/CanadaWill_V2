import React from 'react';

interface LogoProps {
  darkMode?: boolean;
  className?: string;
}

export default function Logo() {
  return (
    <img
      src="https://unicorn-images.b-cdn.net/1d65422d-6224-4e42-ac63-ad4492b21211?optimizer=gif&width=105&height=100"
      alt="CanadaWill"
      width={105}
      height={100}
      style={{ display: 'block', height: 'auto' }}
    />
  );
} 