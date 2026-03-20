import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { redirect } from 'next/navigation'
import { useMDXComponents as getMDXComponents } from '../../../mdx-components'

export const generateStaticParams = generateStaticParamsFor('mdxPath')

export async function generateMetadata(props) {
  const params = await props.params

  if (!params.mdxPath?.length) {
    return {
      title: 'UCL Private Token Docs'
    }
  }

  const { metadata } = await importPage(params.mdxPath)
  return metadata
}

const Wrapper = getMDXComponents().wrapper

export default async function Page(props) {
  const params = await props.params

  if (!params.mdxPath?.length) {
    redirect('/docs/intro')
  }

  const {
    default: MDXContent,
    toc,
    metadata,
    sourceCode
  } = await importPage(params.mdxPath)

  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
