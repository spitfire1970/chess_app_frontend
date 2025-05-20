import httpProxy from 'http-proxy'
import { NextApiRequest, NextApiResponse } from 'next/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : process.env.NEXT_PUBLIC_API_URL_DEPLOYED

const proxy = httpProxy.createProxyServer()

export const config = {
	api: {
		bodyParser: false,
	},
}

export default (req: NextApiRequest, res: NextApiResponse) => {
  return new Promise<void>((resolve, reject) => {
		proxy.web(req, res, { target: API_URL, changeOrigin: true }, (err) => {
			if (err) {
				return reject(err)
			}
			resolve()
		})
	})
}