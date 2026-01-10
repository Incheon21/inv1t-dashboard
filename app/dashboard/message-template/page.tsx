import MessageTemplateEditor from "./MessageTemplateEditor";

export default function MessageTemplatePage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">
                WhatsApp Message Settings
            </h1>
            <MessageTemplateEditor />
        </div>
    );
}
