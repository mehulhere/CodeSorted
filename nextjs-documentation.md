# Next.js Documentation

This document contains information about Next.js, focusing on routing, data fetching, and components.

## Data Fetching

### Server Components
Server Components can be `async` and are ideal for data fetching on the server. They can directly access server-side resources like databases.

**Example: Fetching data in a Server Component**
```tsx
export default async function Page() {
  const data = await fetch('https://api.vercel.app/blog')
  const posts = await data.json()
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

### Client Components
For client-side data fetching, you can use React's `useEffect` hook or a library like `SWR`.

**Example: Fetching data with `useEffect`**
```tsx
'use client'

import { useState, useEffect } from 'react'

export function Posts() {
  const [posts, setPosts] = useState(null)

  useEffect(() => {
    async function fetchPosts() {
      const res = await fetch('https://api.vercel.app/blog')
      const data = await res.json()
      setPosts(data)
    }
    fetchPosts()
  }, [])

  if (!posts) return <div>Loading...</div>

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

**Example: Fetching data with `SWR`**
```tsx
'use client'
import useSWR from 'swr'

const fetcher = (url) => fetch(url).then((r) => r.json())

export default function BlogPage() {
  const { data, error, isLoading } = useSWR(
    'https://api.vercel.app/blog',
    fetcher
  )

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {data.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

### Caching
Next.js extends the `fetch` API to allow you to configure the caching behavior of requests.

*   `cache: 'force-cache'`: (Default) Caches the request.
*   `cache: 'no-store'`: Fetches the request on every request.
*   `next: { revalidate: 10 }`: Caches the request for 10 seconds.

React's `cache` function can be used to memoize data requests.

## Routing

### App Router
The App Router uses a file-system based router. Folders are used to define routes. A special `page.js` file is used to make a route segment publicly accessible.

*   `app/page.js`: Corresponds to the `/` route.
*   `app/dashboard/page.js`: Corresponds to the `/dashboard` route.

Dynamic segments can be created by using square brackets in the folder name (e.g., `app/blog/[slug]/page.js`).

### `<Link>` Component
The `<Link>` component is used for client-side navigation between routes.

```tsx
import Link from 'next/link'

export default function Page() {
  return <Link href="/dashboard">Dashboard</Link>
}
```

## Components

### Server Components
Server Components are the default in the App Router. They run on the server and are good for performance because they don't send any JavaScript to the client.

### Client Components
To use a Client Component, you need to add the `"use client"` directive at the top of the file. Client Components are useful for adding interactivity and using browser-only APIs.

**Example: A Client Component**
```tsx
'use client'

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>Click me</button>
    </div>
  )
}
``` 