import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '@/contexts/SessionContext';

const Index = () => {
  const { session, loading } = useSessionContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (session) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading application...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-foreground">Redirecting...</h1>
        <p className="text-xl text-muted-foreground">Please wait while we check your session.</p>
      </div>
    </div>
  );
};

export default Index;