def lambda_handler(event, context):
    """
    Simple test handler that just returns the event
    """
    print("Event received:", event)
    
    # Just echo back the event plus a message
    return {
        "message": "Hello from Lambda!",
        "received_event": event
    } 