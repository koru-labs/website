/* eslint-env node */
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export const metadata = {
  title: {
    default: 'UCL Private Token Docs',
    template: '%s | UCL Private Token Docs'
  },
  description: 'Documentation for UCL Private Token.'
}

export default async function RootLayout({ children }) {
  const pageMap = await getPageMap()

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={<Navbar logo={<b>UCL Private Token</b>} />}
          pageMap={pageMap}
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          footer={<Footer>UCL Docs {new Date().getFullYear()}</Footer>}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
