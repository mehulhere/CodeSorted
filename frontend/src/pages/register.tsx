import Head from 'next/head';
import { useState, ChangeEvent } from 'react';

interface RegisterResponse {
    message: string;
    insertedID: string;
    token: string;
}

interface ErrorResponse {
    message: string;
}

export default function Register() {
    const [firstname, setFirstname] = useState<string>('');
    const [lastname, setLastname] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');

    // UI States
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); // Prevents default form submission
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            setIsLoading(false);
            return;
        }

        const registrationData = {
            firstname,
            lastname,
            username,
            email, // Include email if your backend is expecting it
            password,
        };

        try {
            const response = await fetch('http://localhost:8080/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registrationData),
            });

            const responseData: RegisterResponse | ErrorResponse = await response.json();

            if (!response.ok) {
                const errorMessage = (responseData as ErrorResponse)?.message || `Error: ${response.status} - ${response.statusText}`;
                setError(errorMessage);
                setIsLoading(false);
                return;
            }

            if ('token' in responseData) {
                setSuccess(`User ${username} registered successfully!`)
                console.log("registration successful")

                // Clear form fields
                setFirstname('');
                setLastname('');
                setUsername('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
            }
            else {
                setError('Token not found');
            }
        } catch (error) {
            console.error('Registration error:', error);
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <>
            <Head>
                <title>Register - Online Judge</title>
            </Head>
            <div className="container">
                <h1>Create Account</h1>
                {error && <p className="error-message">{error}</p>}
                {success && <p className="success-message">{success}</p>}
                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="firstname">First Name</label>
                        <input
                            type="text"
                            id="firstname"
                            value={firstname}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setFirstname(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="lastname">Last Name</label>
                        <input
                            type="text"
                            id="lastname"
                            value={lastname}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setLastname(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            minLength={8}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                            minLength={8}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Registering...' : 'Register'}
                    </button>
                </form>
            </div>
        </>
    )
}