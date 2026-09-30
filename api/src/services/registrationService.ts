import prisma from '../lib/prisma'

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export interface WaitlistedResult {
  status: string
  position: number
}

/**
 * Register an employee for a training session.
 * @param sessionId - The ID of the training session
 * @param name - Employee name
 * @param email - Employee email
 * @returns The created Registration object or WaitlistedResult
 * @throws NotFoundError - Session does not exist
 * @throws ValidationError - Invalid input
 */
export async function registerForSession(
  sessionId: number,
  name: string,
  email: string
) {
  // Input validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError('Name is required')
  }
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    throw new ValidationError('Email is required')
  }
  if (name.length > 255) {
    throw new ValidationError('Name must be 255 characters or less')
  }
  if (email.length > 255) {
    throw new ValidationError('Email must be 255 characters or less')
  }

  return prisma.$transaction(async (tx) => {
    // Fetch session by ID within transaction
    const session = await tx.trainingSession.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      throw new NotFoundError('Training session not found')
    }

    if (session.registered < session.capacity) {
      // Session has capacity - create confirmed registration
      const registration = await tx.registration.create({
        data: {
          name: name.trim(),
          email: email.trim(),
          sessionId,
          status: 'confirmed',
        },
      })

      // Increment session.registered by 1 within transaction
      await tx.trainingSession.update({
        where: { id: sessionId },
        data: { registered: { increment: 1 } },
      })

      return registration
    } else {
      // Session is full - create waitlisted registration
      const waitlistedCount = await tx.registration.count({
        where: {
          sessionId,
          status: 'waitlisted',
        },
      })

      const position = waitlistedCount + 1

      const registration = await tx.registration.create({
        data: {
          name: name.trim(),
          email: email.trim(),
          sessionId,
          status: 'waitlisted',
          waitlistPosition: position,
        },
      })

      return { status: 'waitlisted', position } as WaitlistedResult
    }
  })
}
