import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
                <span className="text-5xl font-bold text-primary">404</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
            <p className="text-muted-foreground mb-8 max-w-md">
                The page you're looking for doesn't exist or the call link may have expired.
            </p>
            <Link to="/">
                <Button className="gap-2">
                    <Home className="w-4 h-4" />
                    Go to Home
                </Button>
            </Link>
        </div>
    );
};

export default NotFound;
