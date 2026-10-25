// Error with a message that is safe to show to the user
export class ApiError extends Error {
  readonly status: number
  // Seconds from the Retry-After header, when the server sent one (e.g. with a 429)
  readonly retryAfter: number | null

  constructor(status: number, message: string, retryAfter: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.retryAfter = retryAfter
  }
}

interface ProblemDetails {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

const CONNECTION_ERROR = "Couldn't connect. Try again."
const GENERIC_ERROR = 'Something went wrong. Try again.'

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      // FormData (file uploads) needs the browser to set its own multipart Content-Type
      headers: init.body instanceof FormData ? init.headers : { 'Content-Type': 'application/json', ...init.headers },
    })
  } catch {
    throw new ApiError(0, CONNECTION_ERROR)
  }

  if (!response.ok) {
    const retryAfter = Number(response.headers.get('Retry-After'))
    throw new ApiError(response.status, await readErrorMessage(response), retryAfter > 0 ? retryAfter : null)
  }
  if (response.status === 204) {
    return undefined as T
  }
  // Files such as audio come back as a Blob; everything else is JSON
  if (!(response.headers.get('Content-Type') ?? '').includes('json')) {
    return (await response.blob()) as T
  }
  return (await response.json()) as T
}

async function readErrorMessage(response: Response): Promise<string> {
  // The Vite proxy answers with a 5xx when the backend isn't running
  if (response.status >= 500) return CONNECTION_ERROR

  try {
    const problem = (await response.json()) as ProblemDetails
    const firstFieldError = problem.errors ? Object.values(problem.errors).flat()[0] : undefined
    return problem.detail ?? firstFieldError ?? problem.title ?? GENERIC_ERROR
  } catch {
    return GENERIC_ERROR
  }
}
