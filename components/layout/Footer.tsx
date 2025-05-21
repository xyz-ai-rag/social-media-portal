export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-3">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center text-center">
          {/* Copyright */}
          <p className="text-gray-600 text-sm mb-2">
            &copy; {new Date().getFullYear()} Hyprdata.ai. All rights reserved.
          </p>

          {/* Links under copyright */}
          <div className="flex space-x-4 mb-2">
            <a
              href="https://www.hyprdata.ai/terms-of-use"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 text-sm underline"
            >
              Terms of Use
            </a>
            <a
              href="https://www.hyprdata.ai/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 text-sm underline"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
