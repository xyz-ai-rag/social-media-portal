export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-6">
      <div className="container mx-auto px-4">
        {/* Center the entire footer content */}
        <div className="flex flex-col items-center justify-center text-center">
          {/* Copyright text */}
          <p className="text-gray-600 text-sm mb-4">
            &copy; {new Date().getFullYear()} Hyprdata.ai Web Portal. All rights reserved.
          </p>
          
          {/* Disclaimer - now centered */}
          <p className="text-gray-500 text-xs italic max-w-2xl mx-auto">
            We use AI to monitor, analyze and report on the data. While we strive for accuracy, AI can produce mistakes. Always double-check important details for accuracy and reliability.
          </p>
          
          {/* Links moved to bottom */}
          {/* <div className="flex space-x-6 mt-4">
            <a href="#" className="text-gray-500 hover:text-gray-700 text-sm">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-700 text-sm">
              Terms of Service
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-700 text-sm">
              Contact Us
            </a>
          </div> */}
        </div>
      </div>
    </footer>
  );
}