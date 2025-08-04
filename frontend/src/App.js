import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { QrCode, Factory, Scan, Users, BarChart3, Settings, LogOut, Camera, CheckCircle, Clock, Play, Pause, Plus, X, ChevronUp, ChevronDown, List, Database, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Authentication Context
const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // You could verify token here
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = React.useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await login(username, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-6 bg-white/10 rounded-full w-fit">
            <img 
              src="https://customer-assets.emergentagent.com/job_metalops/artifacts/i1dybgg7_Velar%20Makine%20Logo%20SVG.png" 
              alt="Velar Makine Logo" 
              className="h-[150px] w-[150px] object-contain"
            />
          </div>
          <CardTitle className="text-2xl text-white">Velar Makine Üretim Takip Sistemi</CardTitle>
          <CardDescription className="text-gray-300">
            Giriş yaparak üretim takip sistemine erişin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Kullanıcı Adı"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                required
              />
            </div>
            {error && (
              <div className="text-red-400 text-sm text-center">{error}</div>
            )}
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// Dedicated Operator QR Scanner Component (Full Screen)
const OperatorScanner = () => {
  const [qrCode, setQrCode] = useState('');
  const [scanType, setScanType] = useState('start');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingQrCode, setPendingQrCode] = useState('');
  const { user, logout } = React.useContext(AuthContext);
  
  const videoRef = React.useRef(null);
  const qrScannerRef = React.useRef(null);
  const isDialogShowing = React.useRef(false);

  // Initialize QR Scanner
  React.useEffect(() => {
    let QrScanner;
    
    const initScanner = async () => {
      try {
        // Dynamically import QrScanner
        const QrScannerModule = await import('qr-scanner');
        QrScanner = QrScannerModule.default;
        
        if (videoRef.current && !manualMode) {
          qrScannerRef.current = new QrScanner(
            videoRef.current,
            (result) => {
              // Only process if no dialog is currently showing
              if (result.data && !isDialogShowing.current) {
                isDialogShowing.current = true;
                setQrCode(result.data);
                setPendingQrCode(result.data);
                setShowConfirmDialog(true);
                // Pause scanning while showing confirmation dialog
                if (qrScannerRef.current) {
                  qrScannerRef.current.stop();
                  setCameraActive(false);
                }
              }
            },
            {
              highlightScanRegion: true,
              highlightCodeOutline: true,
              maxScansPerSecond: 5,
              preferredCamera: 'environment', // Use back camera on mobile
            }
          );
        }
      } catch (err) {
        console.error('Failed to initialize QR Scanner:', err);
        setCameraError('Failed to initialize camera scanner. Please use manual mode.');
        setManualMode(true);
      }
    };

    initScanner();

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
  }, [manualMode]);

  // Start camera
  const startCamera = async () => {
    if (!qrScannerRef.current || manualMode) return;
    
    try {
      setCameraError('');
      await qrScannerRef.current.start();
      setCameraActive(true);
    } catch (err) {
      console.error('Camera start failed:', err);
      let errorMessage = 'Camera access denied. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions and refresh the page.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage += 'Camera not supported in this browser.';
      } else {
        errorMessage += 'Please try manual mode instead.';
      }
      
      setCameraError(errorMessage);
      setManualMode(true);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      setCameraActive(false);
    }
  };

  // Handle automatic scan when QR code is detected
  const handleAutoScan = async (scannedCode) => {
    if (loading) return; // Prevent multiple simultaneous scans
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const endpoint = scanType === 'start' ? '/scan/start' : '/scan/end';
      const response = await axios.post(`${API}${endpoint}`, {
        qr_code: scannedCode,
        username: user.username,
        password: 'session_authenticated'
      });

      setResult(response.data);
      
      // Auto-clear result and restart camera after 3 seconds
      setTimeout(() => {
        setResult(null);
        setQrCode('');
        if (!manualMode && !isDialogShowing.current) {
          startCamera();
        }
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.detail || 'Scan failed');
      
      // Auto-clear error and restart camera after 5 seconds
      setTimeout(() => {
        setError('');
        if (!manualMode && !isDialogShowing.current) {
          startCamera();
        }
      }, 5000);
    }

    setLoading(false);
  };

  // Handle manual scan
  const handleManualScan = async (e) => {
    e.preventDefault();
    if (!qrCode.trim()) return;
    
    await handleAutoScan(qrCode);
  };

  // Handle confirmation dialog - Yes button
  const handleConfirmScan = async () => {
    setShowConfirmDialog(false);
    isDialogShowing.current = false;
    await handleAutoScan(pendingQrCode);
    setPendingQrCode('');
  };

  // Handle confirmation dialog - No button
  const handleCancelScan = () => {
    setShowConfirmDialog(false);
    isDialogShowing.current = false;
    setPendingQrCode('');
    setQrCode('');
    // Resume scanning
    if (!manualMode) {
      startCamera();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex flex-col">
      {/* Header with minimal info */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-full">
              <Camera className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">QR Scanner</h1>
              <p className="text-sm text-gray-300">Operator: {user?.username}</p>
            </div>
          </div>
          <Button 
            onClick={logout} 
            variant="outline" 
            size="sm"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            End Shift
          </Button>
        </div>
      </div>

      {/* Main Scanner Interface */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-blue-600/20 rounded-full w-fit">
                <QrCode className="h-12 w-12 text-blue-400" />
              </div>
              <CardTitle className="text-2xl text-white mb-2">
                QR Code Scanner
              </CardTitle>
              <CardDescription className="text-gray-300">
                {manualMode ? 'Enter QR code manually' : 'Point camera at QR code'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Scan Type Selector */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Action Type
                </label>
                <Select value={scanType} onValueChange={setScanType}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">▶️ Start Process</SelectItem>
                    <SelectItem value="end">⏹️ End Process</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Camera Scanner or Manual Mode Toggle */}
              <div className="flex justify-center mb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManualMode(!manualMode)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {manualMode ? (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Switch to Camera
                    </>
                  ) : (
                    <>
                      <Scan className="h-4 w-4 mr-2" />
                      Manual Entry
                    </>
                  )}
                </Button>
              </div>

              {/* Camera Scanner */}
              {!manualMode && (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    {!cameraActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Button
                          onClick={startCamera}
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={loading}
                        >
                          <Camera className="h-5 w-5 mr-2" />
                          Start Camera
                        </Button>
                      </div>
                    )}
                    {cameraActive && (
                      <div className="absolute top-2 right-2">
                        <Button
                          onClick={stopCamera}
                          variant="outline"
                          size="sm"
                          className="bg-black/50 border-white/20 text-white hover:bg-black/70"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {qrCode && (
                    <div className="text-center">
                      <p className="text-sm text-gray-300">Detected QR Code:</p>
                      <p className="text-white font-mono bg-white/10 p-2 rounded mt-1 break-all">{qrCode}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Entry Mode */}
              {manualMode && (
                <form onSubmit={handleManualScan} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      QR Code
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter QR code..."
                      value={qrCode}
                      onChange={(e) => setQrCode(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-12 text-center font-mono"
                      required
                      autoFocus
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 h-12"
                    disabled={loading || !qrCode.trim()}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {scanType === 'start' ? <Play className="h-5 w-5 mr-2" /> : <Pause className="h-5 w-5 mr-2" />}
                        {scanType === 'start' ? 'START PROCESS' : 'END PROCESS'}
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* Camera Error */}
              {cameraError && (
                <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                  <div className="flex items-start gap-2 text-yellow-400">
                    <Camera className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Camera Issue</p>
                      <p className="text-xs text-yellow-300 mt-1">{cameraError}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Success Message */}
              {result && (
                <div className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 text-green-400 mb-2">
                    <CheckCircle className="h-6 w-6" />
                    <span className="font-semibold">Success!</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-white font-medium">{result.message}</p>
                    <p className="text-green-200">Process Step: {result.step_name}</p>
                    <p className="text-green-200">Time: {new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
              )}
              
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/50 rounded-lg animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <div className="p-1 bg-red-500/20 rounded-full">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    </div>
                    <span className="font-semibold text-sm">Error</span>
                  </div>
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}
            </CardContent>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in duration-300">
                  <div className="text-center mb-6">
                    <div className="mx-auto mb-4 p-3 bg-blue-600/20 rounded-full w-fit">
                      <QrCode className="h-8 w-8 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">QR Kod Tespit Edildi</h3>
                    <p className="text-gray-300 text-sm mb-4">Bu kod işlemi yapılsın mı?</p>
                    <div className="bg-white/5 rounded-lg p-3 mb-4">
                      <p className="text-xs text-gray-400 mb-1">Tespit edilen kod:</p>
                      <p className="text-white font-mono text-sm break-all">{pendingQrCode}</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      İşlem türü: {scanType === 'start' ? '▶️ Başlat' : '⏹️ Bitir'}
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={handleCancelScan}
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10 h-12"
                      disabled={loading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Hayır
                    </Button>
                    <Button
                      onClick={handleConfirmScan}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 h-12"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          İşleniyor...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Evet
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

// QR Scanner Component for Managers/Admins (keeps existing functionality)
const QRScanner = () => {
  const [qrCode, setQrCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [scanType, setScanType] = useState('start');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleScan = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const endpoint = scanType === 'start' ? '/scan/start' : '/scan/end';
      const response = await axios.post(`${API}${endpoint}`, {
        qr_code: qrCode,
        username,
        password
      });

      setResult(response.data);
      setQrCode('');
      setUsername('');
      setPassword('');
    } catch (error) {
      setError(error.response?.data?.detail || 'Scan failed');
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Scan className="h-5 w-5" />
            QR Code Scanner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="space-y-4">
            <div>
              <Select value={scanType} onValueChange={setScanType}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">Start Process</SelectItem>
                  <SelectItem value="end">End Process</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Input
                type="text"
                placeholder="QR Code (or scan with camera)"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                required
              />
            </div>
            
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                required
              />
            </div>
            
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Processing...' : (
                <>
                  {scanType === 'start' ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                  {scanType === 'start' ? 'Start Process' : 'End Process'}
                </>
              )}
            </Button>
          </form>
          
          {result && (
            <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Success</span>
              </div>
              <p className="text-white text-sm">{result.message}</p>
              <p className="text-gray-300 text-sm">Step: {result.step_name}</p>
              <p className="text-gray-300 text-sm">Operator: {result.operator}</p>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/overview`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-gray-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'blocked': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'blocked': return <Pause className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Production Dashboard</h2>
        <Button onClick={fetchDashboardData} variant="outline" size="sm" className="bg-gray-300 hover:bg-gray-400 text-gray-800">
          Refresh
        </Button>
      </div>
      
      <div className="grid gap-4">
        {dashboardData.map((item, index) => (
          <Card key={index} className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-lg">
                  Part: {item.part.part_number}
                </CardTitle>
                <Badge className={`${getStatusColor(item.part.status)} text-white`}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(item.part.status)}
                    {item.part.status.replace('_', ' ').toUpperCase()}
                  </div>
                </Badge>
              </div>
              <CardDescription className="text-gray-300">
                Project: {item.project.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Current Step:</span>
                <span className="text-white font-medium">{item.current_step}</span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Progress</span>
                  <span>{item.part.current_step_index + 1} / {item.total_steps}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${item.progress_percentage}%` 
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {dashboardData.length === 0 && (
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardContent className="py-8 text-center">
              <p className="text-gray-400">No parts in production yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Projects Component
const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [projectsWithParts, setProjectsWithParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [deleteItemType, setDeleteItemType] = useState('project'); // 'project' or 'part'
  const [deleteSelectedId, setDeleteSelectedId] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItemName, setDeleteItemName] = useState('');
  const [selectedSteps, setSelectedSteps] = useState([]);
  const [showStepSelector, setShowStepSelector] = useState(false);

  // Available manufacturing steps
  const availableSteps = [
    "1-DEPO",
    "2-LAZER KESİM", 
    "3-BÜKÜM",
    "4-KAYNAK",
    "5-CNC FREZE",
    "6-CNC TORNA",
    "7-TESVİYE ÇAPAK ALMA",
    "8-KLAVUZ ÇEKME",
    "9-KESİM (Şerit Daire Testere)",
    "10-PRES ŞİŞİRME ÇÖKERTME KALIP",
    "11-MATKAP",
    "12-KUMLAMA",
    "13-YAŞ BOYA",
    "14-MONTAJ",
    "15-DIŞ OPERASYON ISIL İŞLEME SEVK",
    "16-DIŞ OPERASYON KAPLAMA İŞLEMİNE SEVK",
    "17-KAPLAMA GİRİŞ MUAYENE",
    "18-DIŞ OPERASYON YAŞ BOYA İŞLEMİNE SEVK",
    "19-YAŞ BOYA GİRİŞ MUAYENE",
    "20-DIŞ OPERASYON TOZ BOYA İŞLEMİNE SEVK",
    "21-TOZ BOYA GİRİŞ MUAYENE",
    "22-DIŞ İMALATA SEVK",
    "23-DIŞ İMALAT GİRİŞ MUAYENE",
    "24-DIŞ OPERASYON KESİM GİRİŞ MUAYENE",
    "25-KAYNAĞINDA MUAYENE",
    "26-SMLE GİRİŞ",
    "27-SON MUAYENE MÜŞTERİ SEVK",
    "28-YARI MAMÜL",
    "29-PUNTA KAYNAK",
    "30-PLAZMA LAZER SU JETİ SEVK",
    "31-ASTAR BOYA",
    "32-KAYNAK AĞZI AÇMA",
    "33-TAŞLAMA DOĞRULTMA",
    "34-ARA MUAYENE"
  ];

  useEffect(() => {
    fetchProjectsWithParts();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchProjectsWithParts = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      const projects = response.data;
      setProjects(projects);
      
      // Fetch parts for each project
      const projectsWithPartsPromises = projects.map(async (project) => {
        try {
          const partsResponse = await axios.get(`${API}/projects/${project.id}/parts`);
          return {
            ...project,
            parts: partsResponse.data
          };
        } catch (error) {
          console.error(`Failed to fetch parts for project ${project.id}:`, error);
          return {
            ...project,
            parts: []
          };
        }
      });
      
      const projectsWithPartsData = await Promise.all(projectsWithPartsPromises);
      setProjectsWithParts(projectsWithPartsData);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPart = async (e) => {
    e.preventDefault();
    if (!newPartNumber) return;

    // Validation: Project must be selected
    if (!selectedProject) {
      alert('Lütfen bir proje seçin. İş emri mutlaka bir projeye bağlı olmalıdır.');
      return;
    }

    // Validation: At least one process step must be selected
    if (selectedSteps.length === 0) {
      alert('En az bir süreç adımı seçmelisiniz! "Adım Ekle" butonunu kullanarak süreç adımlarını ekleyin.');
      return;
    }

    try {
      // Create the work order within the selected project using custom steps
      await axios.post(`${API}/parts`, {
        part_number: newPartNumber,
        project_id: selectedProject,
        process_steps: selectedSteps
      });
      
      setNewPartNumber('');
      setSelectedProject('');
      setSelectedSteps([]);
      setShowStepSelector(false);
      fetchProjectsWithParts();
    } catch (error) {
      console.error('Failed to create part:', error);
      if (error.response?.data?.detail) {
        alert(`İş emri oluşturulurken hata oluştu: ${error.response.data.detail}`);
      } else {
        alert('İş emri oluşturulurken hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  };

  const addStep = (step) => {
    setSelectedSteps([...selectedSteps, step]);
  };

  const removeStep = (index) => {
    const newSteps = selectedSteps.filter((_, i) => i !== index);
    setSelectedSteps(newSteps);
  };

  const moveStepUp = (index) => {
    if (index === 0) return;
    const newSteps = [...selectedSteps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setSelectedSteps(newSteps);
  };

  const moveStepDown = (index) => {
    if (index === selectedSteps.length - 1) return;
    const newSteps = [...selectedSteps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setSelectedSteps(newSteps);
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      await axios.post(`${API}/projects`, {
        name: newProjectName,
        description: `Project created: ${newProjectName}`,
        process_steps: [
          "Initial Quality Control",
          "Machining (CNC)", 
          "Welding",
          "Painting",
          "Final Quality Control"
        ]
      });
      
      setNewProjectName('');
      fetchProjects();
      fetchProjectsWithParts();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDeleteClick = () => {
    if (!deleteSelectedId) return;
    
    let itemName = '';
    if (deleteItemType === 'project') {
      const project = projects.find(p => p.id === deleteSelectedId);
      itemName = project?.name || '';
    } else {
      // Find part across all projects
      let part = null;
      for (const project of projectsWithParts) {
        part = project.parts?.find(p => p.id === deleteSelectedId);
        if (part) break;
      }
      itemName = part?.part_number || '';
    }
    
    setDeleteItemName(itemName);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteItemType === 'project') {
        await axios.delete(`${API}/projects/${deleteSelectedId}`);
        fetchProjects();
        fetchProjectsWithParts(); // Refresh projects with parts as well since they might be affected
      } else {
        await axios.delete(`${API}/parts/${deleteSelectedId}`);
        fetchProjectsWithParts();
      }
      
      setShowDeleteConfirm(false);
      setDeleteSelectedId('');
      setDeleteItemName('');
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteItemName('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Projeler ve İş Emirleri</h2>
      
      {/* New Project Creation Section */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Yeni Proje Ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createProject} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Yeni Proje Adı"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                required
              />
            </div>
            
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              Proje Oluştur
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Yeni İş Emri Ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createPart} className="space-y-4">
            <div>
              <div className="mb-2">
                <label className="text-sm font-medium text-white">Proje Seçin</label>
                <p className="text-xs text-gray-400">İş emri mutlaka bir projeye bağlı olmalıdır</p>
              </div>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Proje Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Input
                type="text"
                placeholder="İş Emri No"
                value={newPartNumber}
                onChange={(e) => setNewPartNumber(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                required
              />
            </div>
            
            {/* Step Selection Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">İş Akış Adımları</label>
                  <p className="text-xs text-gray-400 mt-1">En az bir adım seçmelisiniz</p>
                </div>
                <Button
                  type="button"
                  onClick={() => setShowStepSelector(!showStepSelector)}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adım Ekle
                </Button>
              </div>
              
              {/* Step Selector Dropdown */}
              {showStepSelector && (
                <Card className="bg-white/5 border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white">Mevcut Adımları Seçin</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                      {availableSteps.map((step, index) => (
                        <Button
                          key={index}
                          type="button"
                          onClick={() => addStep(step)}
                          variant="outline"
                          size="sm"
                          className="justify-start text-left border-white/20 text-white hover:bg-white/10 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-2" />
                          {step}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Selected Steps Display */}
              {selectedSteps.length > 0 && (
                <Card className="bg-blue-600/5 border-blue-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-blue-300 flex items-center">
                      <List className="h-4 w-4 mr-2" />
                      Seçili Adımlar ({selectedSteps.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedSteps.map((step, index) => (
                        <div key={index} className="flex items-center justify-between bg-white/5 rounded p-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded">
                              {index + 1}
                            </span>
                            <span className="text-sm text-white">{step}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              onClick={() => moveStepUp(index)}
                              disabled={index === 0}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              onClick={() => moveStepDown(index)}
                              disabled={index === selectedSteps.length - 1}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              onClick={() => removeStep(index)}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              İş Emri Oluştur
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Delete Section - Moved directly below the "Yeni İş Emri Ekle" box */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10 border-red-500/30">
        <CardHeader>
          <CardTitle className="text-white">Proje Veya İş Emrini Sil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Select value={deleteItemType} onValueChange={(value) => {
                setDeleteItemType(value);
                setDeleteSelectedId(''); // Clear selection when switching types
              }}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Proje Sil</SelectItem>
                  <SelectItem value="part">İş Emri Sil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Select value={deleteSelectedId} onValueChange={setDeleteSelectedId}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder={deleteItemType === 'project' ? 'Proje Seçin' : 'İş Emri Seçin'} />
                </SelectTrigger>
                <SelectContent>
                  {deleteItemType === 'project' 
                    ? projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))
                    : projectsWithParts.flatMap(project => 
                        project.parts?.map(part => (
                          <SelectItem key={part.id} value={part.id}>
                            {part.part_number} ({project.name})
                          </SelectItem>
                        )) || []
                      )
                  }
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleDeleteClick}
              disabled={!deleteSelectedId}
              className="bg-red-600 hover:bg-red-700"
            >
              Sil
            </Button>
          </div>
        </CardContent>
      </Card>
      
      
      {/* Projects with their Work Orders - Hierarchical Display */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white">Projeler ve İş Emirleri</h3>
        
        {projectsWithParts.map(project => (
          <Card key={project.id} className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white text-lg">{project.name}</CardTitle>
                  <CardDescription className="text-gray-300">
                    {project.description}
                  </CardDescription>
                  <div className="mt-2">
                    <Badge className="bg-blue-600/20 text-blue-300 border-blue-600/30">
                      {project.parts?.length || 0} İş Emri
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            {/* Work Orders within this Project */}
            {project.parts && project.parts.length > 0 && (
              <CardContent>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white mb-3">İş Emirleri:</h4>
                  <div className="grid gap-3">
                    {project.parts.map(part => (
                      <div key={part.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-white font-medium">{part.part_number}</span>
                            <div className="text-sm text-gray-300 mt-1">
                              Adım: {part.current_step_index + 1} / {part.total_steps}
                            </div>
                          </div>
                          <Badge className={`${getStatusColor(part.status)} text-white`}>
                            {part.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-gray-400">
                          Oluşturuldu: {new Date(part.created_at).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
            
            {/* Empty state for projects with no work orders */}
            {(!project.parts || project.parts.length === 0) && (
              <CardContent>
                <div className="text-center py-4 text-gray-400">
                  Bu projede henüz iş emri bulunmuyor
                </div>
              </CardContent>
            )}
          </Card>
        ))}
        
        {/* Empty state for no projects */}
        {projectsWithParts.length === 0 && !loading && (
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardContent className="py-8 text-center">
              <p className="text-gray-400">Henüz proje bulunmuyor</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Bu dosyayı '{deleteItemName}' silmek istediğinize emin misiniz?
            </h3>
            <div className="flex gap-3 justify-end">
              <Button 
                onClick={cancelDelete}
                variant="outline"
                className="border-gray-500 text-gray-300 hover:bg-gray-700"
              >
                İptal Et
              </Button>
              <Button 
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Sil
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// QR Codes Component  
const QRCodes = () => {
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState('');
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const qrCodesContainerRef = useRef(null);

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      const response = await axios.get(`${API}/parts`);
      setParts(response.data);
    } catch (error) {
      console.error('Failed to fetch parts:', error);
    }
  };

  const fetchQRCodes = async (partId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/parts/${partId}/qr-codes`);
      setQrCodes(response.data);
    } catch (error) {
      console.error('Failed to fetch QR codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePartChange = (partId) => {
    setSelectedPart(partId);
    if (partId) {
      fetchQRCodes(partId);
    } else {
      setQrCodes([]);
    }
  };

  const exportToPDF = async () => {
    if (!qrCodes.length || !qrCodesContainerRef.current) return;
    
    setExportingPDF(true);
    try {
      // Create a temporary container for PDF generation
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm'; // A4 width
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.padding = '20px';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      document.body.appendChild(tempContainer);

      // Create PDF content
      let pdfContent = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">QR Codes Report</h1>
          <p style="color: #666; margin: 0;">Generated on ${new Date().toLocaleDateString()}</p>
        </div>
      `;

      qrCodes.forEach((qrData, index) => {
        pdfContent += `
          <div style="margin-bottom: 40px; page-break-inside: avoid;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0 0 10px 0; font-size: 18px;">${qrData.step_name}</h2>
              <span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
                ${qrData.status.replace('_', ' ')}
              </span>
            </div>
            
            <div style="display: flex; justify-content: space-around; align-items: center;">
              <div style="text-align: center; flex: 1;">
                <h3 style="color: #28a745; margin-bottom: 15px; font-size: 16px;">START QR Code</h3>
                <div style="background: white; padding: 20px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <img src="${qrData.start_qr.image}" style="width: 120px; height: 120px; display: block;" />
                </div>
                <p style="font-size: 10px; color: #666; margin-top: 10px; word-break: break-all; max-width: 150px;">${qrData.start_qr.code}</p>
              </div>
              
              <div style="text-align: center; flex: 1;">
                <h3 style="color: #dc3545; margin-bottom: 15px; font-size: 16px;">END QR Code</h3>
                <div style="background: white; padding: 20px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <img src="${qrData.end_qr.image}" style="width: 120px; height: 120px; display: block;" />
                </div>
                <p style="font-size: 10px; color: #666; margin-top: 10px; word-break: break-all; max-width: 150px;">${qrData.end_qr.code}</p>
              </div>
            </div>
          </div>
        `;
      });

      tempContainer.innerHTML = pdfContent;

      // Convert to canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download PDF
      const selectedPartName = parts.find(part => part.id === selectedPart)?.part_number || 'Unknown';
      pdf.save(`QR_Codes_${selectedPartName}_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">QR Codes</h2>
      
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Generate QR Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedPart} onValueChange={handlePartChange}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Select Part" />
            </SelectTrigger>
            <SelectContent>
              {parts.map(part => (
                <SelectItem key={part.id} value={part.id}>
                  {part.part_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {qrCodes.length > 0 && (
        <div className="flex justify-end">
          <Button 
            onClick={exportToPDF}
            disabled={exportingPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FileDown className="h-4 w-4 mr-2" />
            {exportingPDF ? 'Generating PDF...' : 'Export as PDF'}
          </Button>
        </div>
      )}
      
      {loading && (
        <div className="text-center text-white">Loading QR codes...</div>
      )}
      
      <div className="grid gap-6" ref={qrCodesContainerRef}>
        {qrCodes.map((qrData, index) => (
          <Card key={index} className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">{qrData.step_name}</CardTitle>
                <Badge className={`${getStatusColor(qrData.status)} text-white`}>
                  {qrData.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="text-center">
                  <h4 className="text-green-400 font-medium mb-2">START QR Code</h4>
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <img src={qrData.start_qr.image} alt="Start QR" className="w-32 h-32" />
                  </div>
                  <p className="text-xs text-gray-400 mt-2 break-all">{qrData.start_qr.code}</p>
                </div>
                
                <div className="text-center">
                  <h4 className="text-red-400 font-medium mb-2">END QR Code</h4>
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <img src={qrData.end_qr.image} alt="End QR" className="w-32 h-32" />
                  </div>
                  <p className="text-xs text-gray-400 mt-2 break-all">{qrData.end_qr.code}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Veriler (Data) Component - Manager Only
const Veriler = () => {
  const [durationData, setDurationData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [parts, setParts] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedPart, setSelectedPart] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingParts, setLoadingParts] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchDurationData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectParts(selectedProject);
      setSelectedPart(''); // Reset part selection when project changes
    } else {
      setParts([]);
      setSelectedPart('');
    }
  }, [selectedProject]);

  useEffect(() => {
    filterData();
  }, [durationData, selectedProject, selectedPart]);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchProjectParts = async (projectId) => {
    setLoadingParts(true);
    try {
      const response = await axios.get(`${API}/projects/${projectId}/parts`);
      setParts(response.data);
    } catch (error) {
      console.error('Failed to fetch project parts:', error);
      setParts([]);
    } finally {
      setLoadingParts(false);
    }
  };

  const fetchDurationData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API}/veriler`);
      setDurationData(response.data);
    } catch (error) {
      console.error('Failed to fetch duration data:', error);
      if (error.response?.status === 403) {
        setError('Bu sayfaya erişim yetkiniz bulunmamaktadır. Sadece yöneticiler bu verileri görüntüleyebilir.');
      } else {
        setError('Veri yüklenirken bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    if (!selectedProject || !selectedPart) {
      setFilteredData([]);
      return;
    }

    const selectedProjectData = projects.find(p => p.id === selectedProject);
    const selectedPartData = parts.find(p => p.id === selectedPart);

    if (!selectedProjectData || !selectedPartData) {
      setFilteredData([]);
      return;
    }

    const filtered = durationData.filter(item => 
      item.project_name === selectedProjectData.name && 
      item.part_number === selectedPartData.part_number
    );

    setFilteredData(filtered);
  };

  const formatDuration = (minutes) => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)} saniye`;
    }
    return `${minutes.toFixed(1)} dakika`;
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Veriler</h2>
        <Card className="bg-red-500/10 backdrop-blur-lg border-red-500/20">
          <CardContent className="pt-6">
            <p className="text-red-300 text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Veriler</h2>
        <Button 
          onClick={fetchDurationData} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Yenileniyor...' : 'Verileri Yenile'}
        </Button>
      </div>

      {/* Filter Controls */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Filtreler</CardTitle>
          <CardDescription className="text-gray-300">
            Proje ve iş emri seçerek verileri filtreleyebilirsiniz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Project Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Proje Seçin</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                disabled={loadingProjects}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">
                  {loadingProjects ? 'Projeler yükleniyor...' : 'Proje seçin'}
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id} className="bg-gray-800 text-white">
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Work Order (Part) Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">İş Emri Seçin</label>
              <select
                value={selectedPart}
                onChange={(e) => setSelectedPart(e.target.value)}
                disabled={!selectedProject || loadingParts}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="">
                  {!selectedProject 
                    ? 'Önce proje seçin' 
                    : loadingParts 
                      ? 'İş emirleri yükleniyor...' 
                      : 'İş emri seçin'
                  }
                </option>
                {parts.map((part) => (
                  <option key={part.id} value={part.id} className="bg-gray-800 text-white">
                    {part.part_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedProject && selectedPart && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <p className="text-blue-300 text-sm">
                <span className="font-medium">Seçili Proje:</span> {projects.find(p => p.id === selectedProject)?.name}
                <span className="mx-2">•</span>
                <span className="font-medium">Seçili İş Emri:</span> {parts.find(p => p.id === selectedPart)?.part_number}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Data Display */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">İşlem Süreleri</CardTitle>
          <CardDescription className="text-gray-300">
            {selectedProject && selectedPart 
              ? 'Seçili proje ve iş emri için QR kod tarama başlangıç ve bitiş süreleri arasındaki fark'
              : 'Verileri görüntülemek için yukarıdan proje ve iş emri seçin'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-white py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              Veriler yükleniyor...
            </div>
          ) : !selectedProject || !selectedPart ? (
            <div className="text-center text-gray-400 py-8">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <p className="text-lg font-medium mb-2">Filtre Seçimi Gerekli</p>
              <p>Verileri görüntülemek için yukarıdan proje ve iş emri seçin.</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-lg font-medium mb-2">Veri Bulunamadı</p>
              <p>Seçili proje ve iş emri için henüz tamamlanmış işlem verisi bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredData.map((item) => (
                <Card key={item.id} className="bg-white/5 border-white/10">
                  <CardContent className="pt-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-white font-medium mb-2">{item.step_name}</h4>
                        <div className="space-y-1 text-sm text-gray-300">
                          <p><span className="text-gray-400">Proje:</span> {item.project_name}</p>
                          <p><span className="text-gray-400">Parça No:</span> {item.part_number}</p>
                          <p><span className="text-gray-400">Operatör:</span> {item.operator_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-400 mb-2">
                          Bu işlem {formatDuration(item.duration_minutes)} sürmüştür.
                        </div>
                        <div className="space-y-1 text-xs text-gray-400">
                          <p>Başlangıç: {formatDateTime(item.start_time)}</p>
                          <p>Bitiş: {formatDateTime(item.end_time)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Main App Component with Role-Based Interface
const MainApp = () => {
  const { user, logout } = React.useContext(AuthContext);

  // If user is operator, show only the dedicated scanner interface
  if (user?.role === 'operator') {
    return <OperatorScanner />;
  }

  // For managers and admins, show the full interface with navigation
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <nav className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img 
                src="https://customer-assets.emergentagent.com/job_metalops/artifacts/i1dybgg7_Velar%20Makine%20Logo%20SVG.png" 
                alt="Velar Makine Logo" 
                className="h-8 w-8 object-contain"
              />
              <span className="text-xl font-bold text-white">Velar Makine Üretim Takip Sistemi</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge className="bg-blue-600/20 text-blue-300 border-blue-600/30">
                {user?.role?.toUpperCase() || 'USER'}
              </Badge>
              <span className="text-gray-300">Merhaba, {user?.username}</span>
              <Button 
                onClick={logout} 
                variant="outline" 
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="scanner" className="space-y-6">
          <TabsList className={`grid w-full ${(user?.role === 'manager' || user?.role === 'admin') ? 'grid-cols-5' : 'grid-cols-4'} bg-white/10 backdrop-blur-lg`}>
            <TabsTrigger value="scanner" className="data-[state=active]:bg-white/20">
              <Scan className="h-4 w-4 mr-2" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-white/20">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-white/20">
              <Settings className="h-4 w-4 mr-2" />
              Projeler ve İş Emirleri
            </TabsTrigger>
            <TabsTrigger value="qrcodes" className="data-[state=active]:bg-white/20">
              <QrCode className="h-4 w-4 mr-2" />
              QR Codes
            </TabsTrigger>
            {(user?.role === 'manager' || user?.role === 'admin') && (
              <TabsTrigger value="veriler" className="data-[state=active]:bg-white/20">
                <Database className="h-4 w-4 mr-2" />
                Veriler
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="scanner">
            <QRScanner />
          </TabsContent>
          
          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>
          
          <TabsContent value="projects">
            <Projects />
          </TabsContent>
          
          <TabsContent value="qrcodes">
            <QRCodes />
          </TabsContent>
          
          <TabsContent value="veriler">
            <Veriler />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Helper function for status colors
const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'bg-gray-500';
    case 'in_progress': return 'bg-blue-500';  
    case 'completed': return 'bg-green-500';
    case 'blocked': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

// Root App Component
function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <AuthContext.Consumer>
            {({ token }) => (
              token ? <MainApp /> : <Login />
            )}
          </AuthContext.Consumer>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;