import "./globals.css";

export const metadata = {
  title: "Marginalia — A Literary Companion",
  description: "AI-powered literary tutor for guided reading and reflection",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
