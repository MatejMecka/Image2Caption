export const generateMessage = function(image_url, custom_prompt) {
    // Generate Image Object
    const image_object = {
        "type": "image",
        "image": image_url
    }

    // Write the message here
    const message_content_object = {
        "type": "text",
        "text": custom_prompt || "I am a user with impaired vision. Would you describe the image with as much accuracy and details as possible?"
    }

    const object_for_llm = {
        "role": "user",
        "content": [
            image_object,
            message_content_object
        ]
    }

    const message_to_browser = {
        "message": "caption",
        "data": object_for_llm
    }

    return message_to_browser
}