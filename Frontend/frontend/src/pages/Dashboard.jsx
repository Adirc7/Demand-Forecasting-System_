import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AssistantBot from '../components/AssistantBot';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Modules available in the system (shown based on the user's role)
    const allModules = [
        { name: "Inventory Alerts", path: "/inventory", desc: "Monitor stock levels and act on reorder alerts.", roleMatch: ['inventory_manager', 'admin'], tint: '#eff6ff', ink: '#2563eb', icon: "📦" },
        { name: "AI Forecasts", path: "/forecasts", desc: "Predictive demand insights powered by machine learning.", roleMatch: ['forecast_manager', 'admin'], tint: '#f5f3ff', ink: '#7c3aed', icon: "📈" },
        { name: "Sales", path: "/sales", desc: "Record transactions and track sales performance.", roleMatch: ['sales_manager', 'admin'], tint: '#f0fdf4', ink: '#16a34a', icon: "💳" },
        { name: "Products", path: "/products/add", desc: "Add new SKUs and manage your product catalog.", roleMatch: ['product_manager', 'admin'], tint: '#fff7ed', ink: '#ea580c', icon: "🏷️" },
        { name: "Reports", path: "/reports", desc: "Analytics, accuracy metrics and exportable reports.", roleMatch: ['report_analyst', 'admin'], tint: '#f0fdfa', ink: '#0d9488', icon: "📊" },
        { name: "User Management", path: "/users", desc: "Control access, roles and security settings.", roleMatch: ['admin'], tint: '#fef2f2', ink: '#dc2626', icon: "👥" },
    ];

    // Check if user has access to a module
    const hasAccess = (mod) => user?.isAdmin || mod.roleMatch.includes(user?.role);

    const name = user?.name || user?.email?.split('@')[0] || 'there';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return (
        <div className="min-h-[calc(100vh-64px)] bg-[var(--app-bg)] px-6 py-10 md:px-10">
            <div className="mx-auto max-w-6xl">
                <header className="mb-10">
                    <p className="text-sm font-medium text-[var(--brand)] mb-2">Dropex Smart Inventory</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                        {greeting}, <span className="capitalize">{name}</span>
                    </h1>
                    <p className="mt-2 text-slate-500 text-base">
                        Choose a module to get started.
                    </p>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {allModules.map((module) => {
                        const accessible = hasAccess(module);
                        return (
                            <button
                                key={module.name}
                                type="button"
                                disabled={!accessible}
                                onClick={() => accessible && navigate(module.path)}
                                className={`group text-left rounded-2xl border bg-white p-6 flex flex-col transition duration-200 ${accessible
                                    ? 'border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 cursor-pointer'
                                    : 'border-slate-200 opacity-55 cursor-not-allowed'}`}
                                style={{ minHeight: '190px' }}
                            >
                                <div className="flex items-start justify-between">
                                    <div
                                        className="w-11 h-11 rounded-xl grid place-items-center text-xl"
                                        style={{ background: module.tint, color: module.ink }}
                                    >
                                        {module.icon}
                                    </div>
                                    {!accessible && (
                                        <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">🔒 No access</span>
                                    )}
                                </div>
                                <h2 className="mt-5 text-lg font-semibold text-slate-900">{module.name}</h2>
                                <p className="mt-1 text-sm leading-relaxed text-slate-500 flex-1">{module.desc}</p>
                                {accessible && (
                                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: module.ink }}>
                                        Open <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <AssistantBot />
        </div>
    );
}
