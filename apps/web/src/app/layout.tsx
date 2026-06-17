export const metadata = {
  title: "Accelute QA Agent",
  description: "GitHub PR QA Agent dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, color: "#0f172a" }}>
        {children}
      </body>
    </html>
  );
}
