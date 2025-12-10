import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Loader2, Send } from 'lucide-react';

interface LessonAIChatProps {
  lessonTitle: string;
  lessonContent: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function LessonAIChat({
  lessonTitle,
  lessonContent,
  supabaseUrl,
  supabaseAnonKey,
}: LessonAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMessages([]);
    setUserInput('');
  }, [lessonTitle, lessonContent]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const newUserMessage: Message = {
      role: 'user',
      content: userInput.trim(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const apiUrl = `${supabaseUrl}/functions/v1/lesson-assistant`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonTitle,
          lessonContent,
          chatHistory: messages,
          userMessage: newUserMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.content,
          },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
          },
        ]);
      }
    } catch (error) {
      console.error('Error calling lesson assistant:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I could not connect to the AI assistant. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const starterPrompts = [
    "Can you explain this in simpler terms?",
    "Can you give me an example?",
    "What's the main point of this lesson?",
    "How can I apply this?",
  ];

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
          title="Ask AI for help"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-20 z-40 transition-opacity md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed bottom-0 right-0 z-50 bg-white shadow-2xl rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none w-full md:w-[420px] h-[80vh] md:h-[600px] flex flex-col">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 flex items-center justify-between rounded-t-2xl md:rounded-tl-2xl md:rounded-tr-none shadow-md">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-lg">Lesson Assistant</h3>
                  <p className="text-xs text-purple-100">Ask me anything about this lesson</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-purple-500 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 && !isLoading && (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mb-3">
                      <Sparkles className="w-8 h-8 text-purple-600" />
                    </div>
                    <p className="text-gray-600 text-sm font-medium">
                      How can I help you with this lesson?
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide px-2">
                      Quick questions
                    </p>
                    {starterPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setUserInput(prompt);
                        }}
                        className="w-full px-4 py-3 bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-700 rounded-lg transition-colors text-left border border-gray-200 hover:border-purple-300 text-sm"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, idx) => (
                <div key={idx}>
                  {message.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]">
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm">
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200 p-4 bg-white rounded-b-2xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question..."
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none text-sm"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isLoading}
                  className="px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-md transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
