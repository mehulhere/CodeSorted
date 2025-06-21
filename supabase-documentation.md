# Supabase Documentation

This document provides a summary of the Supabase documentation, focusing on its integration with Next.js for authentication and database operations.

## Supabase Client

The Supabase client is the primary interface for interacting with your Supabase backend.

### Initialization

To use the Supabase client, you first need to initialize it with your project's URL and anon key.

#### In a Browser Environment

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://xyzcompany.supabase.co', 'public-anon-key')
```

#### In a Server-Side Environment (e.g., Next.js Route Handlers)

For server-side operations, especially those requiring elevated privileges, use the service role key.

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
```

## Authentication

Supabase provides a comprehensive suite of authentication methods.

### User Sign-Up

You can sign up users with an email and password.

```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'example@email.com',
  password: 'example-password',
  options: {
    data: {
      first_name: 'John',
      last_name: 'Doe',
    }
  }
})
```

### User Sign-In

Sign in users with their email and password.

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'example@email.com',
  password: 'example-password',
})
```

### Social Logins (OAuth)

Supabase supports a wide range of OAuth providers.

```javascript
async function signInWithGitHub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
  })
}
```

Other providers include `google`, `facebook`, `twitter`, `azure`, `bitbucket`, `gitlab`, `apple`, `discord`, `figma`, `notion`, `slack`, `spotify`, `twitch`, `workos`.

### Sign Out

```javascript
const { error } = await supabase.auth.signOut()
```

## Database Operations

The Supabase client provides a fluent API for interacting with your PostgreSQL database.

### Fetching Data

You can query your tables using `select()`.

```javascript
// Get all rows
const { data: notes, error } = await supabase.from('notes').select('*')

// Get specific columns
const { data, error } = await supabase.from('cities').select('name, country_id')

// Get a single row by ID
const { data, error } = await supabase.from('cities').select().eq('id', 1).single()
```

### Inserting Data

Use `insert()` to add new rows.

```javascript
const { error } = await supabase.from('cities').insert({ id: 1, name: 'Copenhagen' })
```

### Updating Data

Use `update()` to modify existing rows.

```javascript
const { error } = await supabase
  .from('countries')
  .update({ name: 'Denmark' })
  .eq('id', 1)
```

### Upserting Data

`upsert()` will update a row if it exists, or insert it if it doesn't.

```javascript
const { error } = await supabase
  .from('countries')
  .upsert({ id: 1, name: 'Albania' })
```

### Deleting Data

Use `delete()` to remove rows.

```javascript
const { error } = await supabase
  .from('countries')
  .delete()
  .eq('id', 1)
```

## Realtime Subscriptions

You can subscribe to database changes in real-time.

```javascript
const channel = supabase.channel('any')
  .on('postgres_changes', { event: '*', schema: '*' }, (payload) => {
    console.log('Change received!', payload)
  })
  .subscribe()
``` 