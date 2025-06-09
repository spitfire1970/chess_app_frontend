import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Nakul's personalized chess app",
  description: "Play with personalized chess bots that mimic the play style of different chess.com players using ML",
  icons: {
    icon: "https://utfs.io/f/your-file.png",
  },
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="bg-black">
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
