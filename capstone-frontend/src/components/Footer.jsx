import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t py-6 text-center text-sm text-gray-600">
      <h2>Footer © {currentYear}</h2>
    </footer>
  );
};

export default Footer;