/**
 * Utility functions for serializing MongoDB documents for client components
 */

/**
 * Recursively converts MongoDB ObjectIds to strings in an object
 * This ensures compatibility with Next.js Client Components
 */
export function serializeDocument<T = any>(doc: any): T {
  if (!doc) return doc

  // Handle arrays
  if (Array.isArray(doc)) {
    return doc.map(item => serializeDocument(item)) as T
  }

  // Handle objects
  if (typeof doc === 'object' && doc !== null) {
    // If the entire object is an ObjectId-like value, convert directly
    if ((doc as any).toString && (((doc as any)._bsontype === 'ObjectId') || (doc as any).constructor?.name === 'ObjectId')) {
      return (doc as any).toString() as T
    }

    // If it's a Date, convert to ISO string
    if (doc instanceof Date) {
      return doc.toISOString() as T
    }

    const serialized: any = {}
    
    for (const [key, value] of Object.entries(doc)) {
      if (value && typeof value === 'object') {
        // Check if it's an ObjectId (has toString method and _bsontype)
        const v: any = value as any
        if (v.toString && (v._bsontype === 'ObjectId' || v.constructor?.name === 'ObjectId')) {
          serialized[key] = v.toString()
        }
        // Handle Date objects
        else if (value instanceof Date) {
          serialized[key] = value.toISOString()
        }
        // Recursively handle nested objects and arrays
        else {
          serialized[key] = serializeDocument(value)
        }
      } else {
        serialized[key] = value
      }
    }
    
    return serialized as T
  }

  return doc
}

/**
 * Specifically handles MongoDB documents with common patterns
 */
export function serializeMongoDocument<T = any>(doc: any): T {
  if (!doc) return doc

  const serialized = serializeDocument(doc)
  
  // Ensure _id is always a string if it exists
  if (serialized._id) {
    serialized._id = serialized._id.toString()
  }

  return serialized as T
}