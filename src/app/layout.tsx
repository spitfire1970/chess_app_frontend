import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Nakul's personalized chess app",
  description: "Play with personalized chess bots that mimic the play style of different chess.com players using ML",
  icons: {
    icon: "https://utfs.io/f/7834ea10-f86a-4d8c-9f64-05eecda24bdd-25aw.png",
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
