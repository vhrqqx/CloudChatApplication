package com.chatApp.cloudChat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class CloudChatApplication {
	public static void main(String[] args) {
		SpringApplication.run(CloudChatApplication.class, args);
	}
}
