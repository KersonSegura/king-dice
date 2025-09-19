export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">CSS Test Page</h1>
        
        <div className="space-y-4">
          <div className="bg-blue-500 text-white p-4 rounded">
            Blue background with white text
          </div>
          
          <div className="bg-green-500 text-white p-4 rounded">
            Green background with white text
          </div>
          
          <div className="bg-red-500 text-white p-4 rounded">
            Red background with white text
          </div>
          
          <div className="bg-yellow-500 text-black p-4 rounded">
            Yellow background with black text
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gray-200 rounded">
          <p className="text-gray-700">
            If you can see this page with proper styling, Tailwind CSS is working correctly.
          </p>
        </div>
      </div>
    </div>
  );
} 