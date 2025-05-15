import "./globals.css";

const Layout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {return (<html>
<head>
  
</head>
  <body suppressHydrationWarning className = "bg-black">
{children}    
  </body>
</html>)
}

export default Layout;