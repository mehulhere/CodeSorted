import { AppProps } from 'next/app';
import Navbar from '../components/layout/Navbar';
import '../app/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
                <Component {...pageProps} />
            </main>
        </div>
    );
}

export default MyApp; 