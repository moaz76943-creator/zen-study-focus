import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ خطأ: لم يتم ضبط مفتاح GEMINI_API_KEY!\nاكتب: export GEMINI_API_KEY='مفتاحك_هنا'");
  process.exit(1);
}

const prompt = process.argv.slice(2).join(' ');
if (!prompt) {
  console.error("❌ يرجى كتابة المهمة بعد اسم الأمر، مثال:\nnode zen-agent.mjs \"أنشئ ملف كذا\"");
  process.exit(1);
}

console.log(`🚀 جاري تشغيل الوكيل المستقل لتنفيذ: ${prompt}\n`);

const systemPrompt = `You are an expert autonomous software engineer working directly in a git repository.
Your task is to fulfill the user's coding request completely.
Return a valid JSON object ONLY, with this exact schema:
{
  "summary": "Brief explanation of changes",
  "files": [
    { "path": "relative/path/to/file", "content": "Full code content" }
  ],
  "commitMessage": "feat/fix: concise commit message"
}
Do not use markdown wrappers around JSON. Output pure raw JSON only.`;

const payload = {
  contents: [
    { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Request: ${prompt}` }] }
  ],
  generationConfig: {
    temperature: 0.2,
    responseMimeType: "application/json"
  }
};

try {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message);
  }

  const rawJson = data.candidates[0].content.parts[0].text;
  const result = JSON.parse(rawJson);

  console.log(`✅ ملخص الإنجاز: ${result.summary}\n`);

  for (const file of result.files) {
    const fullPath = path.resolve(file.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.content, 'utf8');
    console.log(`📄 تم إنشاء/تحديث: ${file.path}`);
  }

  // Git auto commit & push
  try {
    execSync('git add -A', { stdio: 'inherit' });
    execSync(`git commit -m "${result.commitMessage || 'feat: automated engineering task'}"`, { stdio: 'inherit' });
    execSync('git push origin integration/master-qa-verified-v21', { stdio: 'inherit' });
    console.log(`\n🎉 تم حفظ التغييرات ورفعها إلى GitHub بنجاح!`);
  } catch (gitErr) {
    console.log(`⚠️ تم إنشاء الملفات بنجاح، وتحذير Git بسيط: ${gitErr.message}`);
  }

} catch (err) {
  console.error(`❌ حدث خطأ أثناء التنفيذ:`, err.message);
}
