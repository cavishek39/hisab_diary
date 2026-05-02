export async function processVoiceCommand(prompt: string, accountNames: string[]) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

  try {
    const response = await fetch('/api/voice-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, accountNames }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to process voice command');
    }

    const data = await response.json();
    return data.calls || [];
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('Error in processVoiceCommand:', error);
    if (error.name === 'AbortError') {
      throw new Error('AI processing timed out. Please try again.');
    }
    throw error;
  }
}
