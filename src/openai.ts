import OpenAI from "openai";
import * as dotenv from "dotenv";

// 환경변수 로드
dotenv.config();

// OpenAI 클라이언트 인스턴스 타입
interface OpenAIClient {
  chat: {
    completions: {
      create: (params: any) => Promise<any>;
    };
  };
}

export class OpenAiSingleton {
  private static instance: OpenAiSingleton;
  public openai: OpenAIClient;

  constructor(apiKey: string) {
    if (!apiKey || apiKey === "your_openai_api_key_here") {
      throw new Error(
        "OpenAI API key가 설정되지 않았습니다. .env 파일에서 OPENAI_GPT_API_KEY를 설정해주세요."
      );
    }
    this.openai = new (OpenAI as any)({ apiKey: apiKey }) as OpenAIClient;
  }

  public static getInstance(): OpenAiSingleton {
    if (!OpenAiSingleton.instance) {
      const apiKey = process.env.OPENAI_GPT_API_KEY || "";
      console.log("API Key 확인:", apiKey ? "설정됨" : "설정되지 않음");
      OpenAiSingleton.instance = new (OpenAiSingleton as any)(apiKey);
    }
    return OpenAiSingleton.instance;
  }
}

const singleton = OpenAiSingleton.getInstance();
export default singleton;
