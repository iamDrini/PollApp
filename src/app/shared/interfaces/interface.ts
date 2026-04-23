export interface Poll {
    id:number;
    created_at: string;
    title: string;
    subtitle: string;
    category: string;
    ends_at: string;
    questions:Question[];
}

export interface Question {
    id: number;
    poll_id:number;
    question_text: string;
    allow_multiple: boolean;
    options: Option[];
}

export interface Option{
    id: number;
    question_id: number;
    option_text: string;
    votes: number;
}