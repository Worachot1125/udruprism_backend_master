// src/app/unauthorized/page.tsx
export default function UnauthorizedPage() {
    return (
        <div className="mx-auto max-w-md py-16 text-center">
            <h1 className="text-2xl font-semibold mb-3">Unauthorized</h1>
            <p className="text-gray-600 dark:text-gray-400">
                Your account is not allowed to access this dashboard.
            </p>
        </div>
    );
}
