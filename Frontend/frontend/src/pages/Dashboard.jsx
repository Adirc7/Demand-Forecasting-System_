import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Define the modules based on the app's existing routes
    const allModules = [
        { 
            name: "Inventory Alerts", 
            path: "/inventory", 
            desc: "Monitor stock levels and actionable alerts.", 
            roleMatch: ['inventory_manager', 'admin'],
            gradient: "linear-gradient(135deg, #2563eb, #60a5fa)",
            icon: "📦"
        },
        { 
            name: "AI Forecasts", 
            path: "/forecasts", 
            desc: "Predictive insights powered by machine learning.", 
            roleMatch: ['forecast_manager', 'admin'],
            gradient: "linear-gradient(135deg, #9333ea, #c084fc)",
            icon: "📈"
        },
        { 
            name: "Record Sales", 
            path: "/sales", 
            desc: "Log transactions and analyze sales trends.", 
            roleMatch: ['sales_manager', 'admin'],
            gradient: "linear-gradient(135deg, #16a34a, #4ade80)",
            icon: "💳"
        },
        { 
            name: "Add Product", 
            path: "/products/add", 
            desc: "Expand your catalog with new SKUs.", 
            roleMatch: ['product_manager', 'admin'],
            gradient: "linear-gradient(135deg, #ea580c, #fb923c)",
            icon: "➕"
        },
        { 
            name: "System Reports", 
            path: "/reports", 
            desc: "Comprehensive analytics and performance metrics.", 
            roleMatch: ['report_analyst', 'admin'],
            gradient: "linear-gradient(135deg, #0d9488, #2dd4bf)",
            icon: "📊"
        },
        { 
            name: "User Management", 
            path: "/users", 
            desc: "Control access and system roles.", 
            roleMatch: ['admin'],
            gradient: "linear-gradient(135deg, #dc2626, #f87171)",
            icon: "👥"
        },
    ];

    // Filter modules based on user access
    const visibleModules = allModules.filter(mod => 
        user?.isAdmin || mod.roleMatch.includes(user?.role)
    );

    return (
        <div style={{ backgroundColor: '#050508', minHeight: 'calc(100vh - 70px)' }} className="text-white p-10 flex flex-col items-center">
            <div className="max-w-6xl w-full">
                <header className="mb-12 text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-3" style={{ background: 'linear-gradient(to right, #ffffff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Welcome to Dropex.AI, {user?.name || user?.email?.split('@')[0] || 'Admin'}
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Select a module to manage your smart inventory system.
                    </p>
                </header>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {visibleModules.map((module) => (
                        <div 
                            key={module.name} 
                            onClick={() => navigate(module.path)}
                            className="bg-[#111115] rounded-2xl p-8 cursor-pointer transform transition duration-300 hover:-translate-y-2 hover:shadow-2xl border border-[#1f1f23] hover:border-gray-500 relative overflow-hidden group flex flex-col justify-between"
                            style={{ minHeight: '220px' }}
                        >
                            {/* Decorative background glow */}
                            <div 
                                className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-2xl"
                                style={{ background: module.gradient }}
                            ></div>

                            <div>
                                <div className="text-4xl mb-4 p-3 inline-block rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {module.icon}
                                </div>
                                <h2 className="text-2xl font-bold mb-2 tracking-wide">{module.name}</h2>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    {module.desc}
                                </p>
                            </div>

                            <div className="mt-6 flex items-center text-sm font-semibold tracking-wider text-gray-300 group-hover:text-white transition duration-200">
                                ENTER MODULE <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">→</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
