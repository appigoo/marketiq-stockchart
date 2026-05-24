export const metadata = { title: 'MarketIQ ' }
export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body style={{margin:0}}>{children}</body>
    </html>
  )
}
