import { GoogleGenerativeAI } from '@google/generative-ai'
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config'

if (!GEMINI_API_KEY) {
  throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.')
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

// Rate limiter implementation
class RateLimiter {
  private requests: number[] = []
  private readonly limit: number
  private readonly windowMs: number

  constructor(limit: number, windowMs: number) {
    this.limit = limit
    this.windowMs = windowMs
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    
    if (this.requests.length >= this.limit) {
      const oldestRequest = this.requests[0]
      const waitTime = this.windowMs - (now - oldestRequest)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      return this.waitForSlot()
    }
    
    this.requests.push(now)
  }
}

const rateLimiter = new RateLimiter(3, 60000) // 3 requests per minute

export interface Task {
  description: string
}

export interface ScheduledTask {
  task: string
  time: string
  reason: string
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly isRetryable: boolean = true
  ) {
    super(message)
    this.name = 'GeminiError'
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const isRetryableError = (error: any): boolean => {
  if (error instanceof GeminiError) {
    return error.isRetryable
  }
  return true // Most Gemini errors are retryable
}

const convertTo12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

export const planTasks = async (tasks: Task[]): Promise<ScheduledTask[]> => {
  if (!tasks.length) {
    throw new GeminiError('No tasks provided for planning', 'NO_TASKS', false)
  }

  const taskList = tasks.map(t => t.description).join('\n')
  
  const prompt = `You are a task planning assistant. Create an optimal daily schedule based on the following tasks.
  Consider factors like energy levels, task complexity, and natural breaks.
  
  Tasks:
  ${taskList}
  
  Please provide a schedule in the following exact JSON format:
  {
    "schedule": [
      {
        "task": "exact task description",
        "time": "HH:MM in 24-hour format",
        "reason": "brief explanation of scheduling"
      }
    ]
  }
  
  Important:
  - Use exact 24-hour time format (e.g., "09:00", "14:30")
  - Keep task descriptions exactly as provided
  - Provide clear, concise reasons for scheduling
  - Ensure all times are within a typical day (06:00 to 22:00)
  - Return ONLY the JSON, no additional text`

  let lastError: Error | null = null
  const maxRetries = 3
  const baseDelay = 1000

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await rateLimiter.waitForSlot()

      const result = await model.generateContent(prompt)
      const response = result.response.text()
      
      if (!response) {
        throw new GeminiError('No response received from Gemini', 'NO_RESPONSE')
      }
      
      try {
        const cleanedResponse = response
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim()
        
        const parsedResponse = JSON.parse(cleanedResponse)
        
        if (!parsedResponse.schedule || !Array.isArray(parsedResponse.schedule)) {
          throw new GeminiError('Invalid response format: missing schedule array', 'INVALID_FORMAT')
        }
        
        const validatedSchedule = parsedResponse.schedule.map((item: any) => {
          if (!item.task || !item.time || !item.reason) {
            throw new GeminiError('Invalid schedule item: missing required fields', 'INVALID_FORMAT')
          }
          
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
          if (!timeRegex.test(item.time)) {
            throw new GeminiError(`Invalid time format: ${item.time}`, 'INVALID_FORMAT')
          }
          
          return {
            task: item.task,
            time: convertTo12Hour(item.time),
            reason: item.reason,
            sortTime: item.time
          }
        })
        
        // Sort the schedule by time
        validatedSchedule.sort((a, b) => {
          const [aHours, aMinutes] = a.sortTime.split(':').map(Number)
          const [bHours, bMinutes] = b.sortTime.split(':').map(Number)
          return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes)
        })
        
        // Remove the sortTime property before returning
        return validatedSchedule.map(({ sortTime, ...rest }) => rest)
      } catch (error) {
        if (error instanceof GeminiError) {
          throw error
        }
        console.error('Raw response:', response)
        throw new GeminiError('Failed to parse Gemini response', 'PARSE_ERROR')
      }
    } catch (error) {
      lastError = error as Error
      
      if (!isRetryableError(error) || attempt === maxRetries) {
        if (error instanceof GeminiError) {
          throw error
        }
        
        throw new GeminiError(
          'An unexpected error occurred while planning tasks',
          'UNKNOWN_ERROR'
        )
      }
      
      const delay = baseDelay * Math.pow(2, attempt)
      await sleep(delay)
    }
  }

  throw lastError || new GeminiError('Failed to plan tasks after multiple attempts')
} 