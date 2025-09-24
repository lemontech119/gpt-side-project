import * as fs from "fs";
import * as path from "path";
import csv from "csv-parser";
import * as dotenv from "dotenv";
import puppeteer from "puppeteer";
import openaiInstance from "./openai";

// 환경변수 로드
dotenv.config();

interface SajuData {
  name: string;
  solar_lunar: string;
  birthdate: string;
  birthtime: string;
  birthplace: string;
  topic: string;
  question: string;
}

const csvToJson = async (csvFilePath: string): Promise<SajuData[]> => {
  return new Promise((resolve, reject) => {
    const results: SajuData[] = [];

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (data: any) => results.push(data as SajuData))
      .on("end", () => {
        console.log("CSV 파일을 성공적으로 읽었습니다.");
        resolve(results);
      })
      .on("error", (error) => {
        console.error("CSV 파일 읽기 중 오류 발생:", error);
        reject(error);
      });
  });
};

const aiResponse = async (input: SajuData): Promise<string> => {
  const response = await openaiInstance.openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content:
          "너는 사주 전문가야. 사주에 대해 상세히 설명해주고, 궁금한 점에 대해 답변해줘.",
      },
      {
        role: "user",
        content: `이름: ${input.name}\n양음력: ${input.solar_lunar}\n생년월일: ${input.birthdate}\n생시: ${input.birthtime}\n출생지: ${input.birthplace}\n질문 주제: ${input.topic}\n질문 내용: ${input.question}\n\n위의 정보를 바탕으로 사주에 대해 상세히 설명해주고, 질문에 답변해줘.`,
      },
    ],
  });

  return response.choices[0].message?.content || "No response";
};

const generatePDF = async (content: string, name: string): Promise<string> => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // HTML 템플릿 생성
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>사주 상담 결과</title>
      <style>
        body {
          font-family: 'Malgun Gothic', sans-serif;
          line-height: 1.6;
          margin: 40px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .content {
          white-space: pre-wrap;
          font-size: 14px;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>사주 상담 결과</h1>
        <h2>${name}님의 사주 분석</h2>
      </div>
      <div class="content">${content}</div>
      <div class="footer">
        <p>생성일: ${new Date().toLocaleDateString("ko-KR")}</p>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);

  // PDF 디렉토리 생성
  const pdfDir = path.join(__dirname, "pdf");
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  // 파일명 생성 (현재날짜 + 이름)
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
  const fileName = `${dateStr}_${name}.pdf`;
  const filePath = path.join(pdfDir, fileName);

  // PDF 생성
  await page.pdf({
    path: filePath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      right: "20mm",
      bottom: "20mm",
      left: "20mm",
    },
  });

  await browser.close();
  return filePath;
};

const sajuProcess = async () => {
  console.log("Executing Saju process...");

  // 환경변수 확인
  console.log("환경변수 확인:");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log(
    "OPENAI_GPT_API_KEY:",
    process.env.OPENAI_GPT_API_KEY ? "설정됨" : "설정되지 않음"
  );

  try {
    const csvFilePath = path.join(__dirname, "csv", "saju.csv");
    const jsonData = await csvToJson(csvFilePath);

    console.log("변환된 JSON 데이터:");
    console.log(jsonData);


    const testResponse = await aiResponse(jsonData[0]);

    // PDF 생성 및 저장
    console.log("PDF 생성 중...");
    const pdfPath = await generatePDF(testResponse, jsonData[0].name);
    console.log(`PDF가 저장되었습니다: ${pdfPath}`);

    return jsonData;
  } catch (error) {
    console.error("Saju 프로세스 실행 중 오류 발생:", error);
    throw error;
  }
};

sajuProcess()
  .then((data) => {
    console.log("Saju process completed.");
    console.log(`총 ${data.length}개의 데이터를 처리했습니다.`);
  })
  .catch((error) => {
    console.error("Saju process failed:", error);
  });
